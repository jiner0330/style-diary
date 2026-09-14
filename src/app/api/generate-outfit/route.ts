import { NextRequest, NextResponse } from "next/server"
import { Agent } from "undici"
import { createClient } from "@supabase/supabase-js"
import sharp from "sharp"

export const maxDuration = 60

// ─── Config ───
const VOLCENGINE_KEY = process.env.VOLCENGINE_API_KEY!
const VOLC_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/images/generations"
const SEEDREAM_MODEL = "doubao-seedream-4-0-250828"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const RENDER_BUCKET = "outfit-renders"

const undiciAgent = new Agent({
  connectTimeout: 30_000,
  connect: { rejectUnauthorized: false },
})
const MANNEQUIN_BUCKET = "mannequins"
const PROMPT_VERSION = "v17" // v17: seedream fix - 768x1152, retry, better prompt

// ─── Types ───
interface OutfitItem {
  slot: string
  name: string
  color: string
  category: string
  material?: string | null
  pattern?: string | null
  sub_category?: string | null
  fit?: string | null
  length?: string | null
  neckline?: string | null
  detail?: string | null
  style_tags?: string[] | null
  image_url?: string | null
}

// ─── Mannequin ───
const ANGLE_MAP: Record<number, string> = { 0: "front", 2: "back" }

function getMannequinUrl(gender: string, angleIndex: number): string {
  const angle = ANGLE_MAP[angleIndex] || "front"
  return `${SUPABASE_URL}/storage/v1/object/public/${MANNEQUIN_BUCKET}/${gender}/${angle}.jpg`
}

// ─── Slot labels (Chinese) ───
const SLOT_LABEL: Record<string, string> = {
  dress: "连衣裙", top: "上衣", bottom: "下装",
  outerwear: "外套", shoes: "鞋子", bag: "包",
  accessories: "配饰",
}

// ─── Build Seedream request ───
function resolveImageUrl(url: string): string {
  if (url.startsWith("http")) return url
  if (url.startsWith("/")) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://dada-ai.cn"
    return `${base}${url}`
  }
  return url
}

// Hex → 中文颜色名
const HEX_TO_COLOR_NAME: Record<string, string> = {
  "#F5F5F5": "白色", "#FAF7F4": "米白",
  "#2A2A2A": "黑色", "#5C5C5C": "深灰", "#9A9A9A": "灰色", "#B5C1B4": "灰绿",
  "#6B8FA3": "蓝色", "#A8C4D4": "浅蓝", "#1A2A4A": "藏青", "#7B9CB5": "牛仔蓝",
  "#8B2252": "酒红", "#E8B4B8": "粉色", "#C4A8A3": "豆沙粉", "#D4C5C2": "裸粉",
  "#D4C5A0": "卡其", "#5C3A2A": "棕色",
  "#E8D8A0": "鹅黄", "#F5F0D0": "黄色", "#DDA040": "姜黄",
  "#3A5A3A": "墨绿", "#B4C1A8": "军绿", "#88C8A0": "亮绿", "#50B878": "翠绿", "#98D8B8": "薄荷绿", "#C1D8C3": "浅绿",
  "#D4A5A5": "紫色",
}
function hexToColorName(hex?: string | null): string {
  if (!hex) return ""
  const key = hex.toUpperCase()
  return HEX_TO_COLOR_NAME[key] || ""
}

function buildSeedreamPayload(items: OutfitItem[], angleIndex: number, gender: string) {
  const angle = ANGLE_MAP[angleIndex] || "front"
  const mannequinUrl = getMannequinUrl(gender, angleIndex)

  const imageUrls: string[] = [mannequinUrl]
  const clothingRefs: string[] = []
  let imgIdx = 2

  for (const item of items) {
    if (item.slot === "accessories" && !item.image_url) continue
    const label = SLOT_LABEL[item.slot] || item.slot
    if (item.image_url) {
      imageUrls.push(resolveImageUrl(item.image_url))
      clothingRefs.push(`图${imgIdx}的${label}`)
      imgIdx++
    } else {
      const colorName = hexToColorName(item.color)
      const patternText = item.pattern && item.pattern !== "纯色" ? item.pattern + "图案，" : ""
      const desc = [
        (colorName ? colorName + "色" : "") + patternText + (item.name || ""),
        item.material ? item.material + "材质" : "",
        item.fit ? item.fit + "版型" : "",
        item.neckline || "",
      ]
        .filter(Boolean).join("，")
      clothingRefs.push(`${desc}的${label}`)
    }
  }

  const hasAITextItem = items.some((i) => !i.image_url && i.slot !== "accessories")

  const promptParts = [
    "图1是人物基底参考图。将图1人物的服装完整替换为以下服装：",
    clothingRefs.join("、") + "。",
    "严格按照每张参考图中的服装还原，包括图案纹理、面料质感、版型剪裁、颜色等所有细节。",
    hasAITextItem ? "对于通过文字描述的单品（无参考图），必须准确还原文字中描述的颜色和图案，图案是服装的印花/纹理，必须出现在对应服装上。" : "",
    "保持图1人物的面部五官、发型、肤色和手绘插画风格完全不变。",
    "保持图1的构图和人物比例完全不变——全身完整可见，头顶到脚尖都在画面内，不裁切。",
    "奶油纸纹背景，纯白底色，温暖治愈感。",
    angle === "back"
      ? "背面全身视图，不显示面部。不显示任何前襟、纽扣、领口等正面细节。"
      : "正面全身视图，A字站姿。",
    "如果有配饰参考图（眼镜、手表、项链等），保持其款式和位置还原到图1人物对应位置。",
  ]

  return { imageUrls, prompt: promptParts.join(" ") }
}

// ─── Call Seedream 4.0 (with retry for intermittent Vercel HK → Beijing connectivity) ───
async function callSeedream(imageUrls: string[], prompt: string): Promise<Buffer> {
  const body = JSON.stringify({
    model: SEEDREAM_MODEL,
    prompt,
    image: imageUrls,
    size: "1280x1920",
    watermark: false,
    response_format: "b64_json",
  })

  console.log(`[seedream] request: ${imageUrls.length} images, size=1280x1920, prompt_len=${prompt.length}`)

  let lastErr: any = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(VOLC_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${VOLCENGINE_KEY}`,
          "Content-Type": "application/json",
        },
        body,
        signal: AbortSignal.timeout(50_000),
        dispatcher: undiciAgent,
      } as any)

      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        throw new Error(`Seedream API error ${res.status}: ${errText.slice(0, 300)}`)
      }

      const data = await res.json()
      const images = data.data
      if (!images || images.length === 0) {
        throw new Error("Seedream returned no images")
      }

      const b64 = images[0].b64_json
      if (!b64) throw new Error("Seedream response missing b64_json")

      return Buffer.from(b64, "base64")
    } catch (err: any) {
      lastErr = err
      if (attempt === 0) console.warn("[seedream] attempt 1 failed, retrying:", err.message.slice(0, 150))
    }
  }
  throw lastErr
}

// ─── Auth helper ───
function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization")
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null
}

// ─── Cache fingerprint ───
function outfitFingerprint(items: OutfitItem[], angleIndex: number, gender: string): string {
  const sig = items
    .map((i) => i.image_url || `${i.slot}:${i.name}`)
    .sort().join("||")
  const hash = Array.from(`${PROMPT_VERSION}|${sig}|${angleIndex}|${gender}`)
    .reduce((s, c) => ((s << 5) - s + c.charCodeAt(0)) | 0, 0)
  return (hash >>> 0).toString(36)
}

function hasUserItem(items: OutfitItem[]): boolean {
  return items.some((i) => !!i.image_url && i.image_url.startsWith("http"))
}

// ─── POST /api/generate-outfit ───
export async function POST(request: NextRequest) {
  const token = getToken(request)
  let userId = "guest"
  if (token) {
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user } } = await supabaseAuth.auth.getUser(token)
    if (user) userId = user.id
  }

  try {
    if (!VOLCENGINE_KEY) {
      return NextResponse.json({ error: "Missing VOLCENGINE_API_KEY" }, { status: 500 })
    }

    const body = await request.json()
    const { items, gender } = body as { gender?: string; items: OutfitItem[]; angleIndex?: number }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "请选择至少一件单品" }, { status: 400 })
    }

    const angleIndex = body.angleIndex ?? 0
    const safeGender = gender === "male" ? "male" : "female"

    // Log received items
    for (const it of items) {
      console.log(`[generate-outfit] received: slot=${it.slot} name=${it.name} image_url=${it.image_url ? it.image_url.slice(0, 80) : "no"}`)
    }

    // ─── Cache check ───
    const key = outfitFingerprint(items, angleIndex, safeGender)
    const folder = hasUserItem(items) ? `u/${userId}` : "g"
    const objectPath = `${folder}/${key}.jpg`
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: urlData } = supabaseAnon.storage.from(RENDER_BUCKET).getPublicUrl(objectPath)
    const publicUrl = urlData.publicUrl

    const { imageUrls, prompt: seedreamPrompt } = buildSeedreamPayload(items, angleIndex, safeGender)

    const cached = await fetch(publicUrl, { method: "HEAD" }).then((r) => r.ok).catch(() => false)
    if (cached) {
      console.log("[generate-outfit] cache hit:", objectPath)
      return NextResponse.json({ status: "done", imageUrl: publicUrl, prompt: seedreamPrompt, mode: "seedream", cached: true })
    }

    // ─── Generate ───
    const t0 = Date.now()
    console.log(`[generate-outfit] cache miss, mode=seedream, items=${items.length}`)

    const generatedBuffer = await callSeedream(imageUrls, seedreamPrompt)
    console.log(`[generate-outfit] done in ${Date.now() - t0}ms`)

    // ─── Compress & cache ───
    const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const jpegBuffer = await sharp(generatedBuffer)
      .jpeg({ quality: 85, progressive: true })
      .toBuffer()

    const { error: upErr } = await supabaseAdmin.storage
      .from(RENDER_BUCKET)
      .upload(objectPath, jpegBuffer, { contentType: "image/jpeg", upsert: true })

    if (upErr) {
      console.warn("[generate-outfit] cache upload failed, returning inline:", upErr.message)
      return NextResponse.json({
        status: "done",
        imageUrl: `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`,
        prompt: seedreamPrompt,
        mode: "seedream",
      })
    }

    console.log("[generate-outfit] cache uploaded:", objectPath, `(${(jpegBuffer.length / 1024).toFixed(0)}KB)`)
    return NextResponse.json({ status: "done", imageUrl: publicUrl, prompt: seedreamPrompt, mode: "seedream" })
  } catch (err: any) {
    console.error("[generate-outfit] POST error:", err)
    return NextResponse.json(
      { error: `生成失败：${err.message.slice(0, 200)}` },
      { status: 500 },
    )
  }
}
