import { NextRequest, NextResponse } from "next/server"
import https from "https"
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
}

// ─── Build Seedream request ───
function buildSeedreamPayload(items: OutfitItem[], angleIndex: number, gender: string) {
  const angle = ANGLE_MAP[angleIndex] || "front"
  const mannequinUrl = getMannequinUrl(gender, angleIndex)

  // Separate: items with real photos → reference images; AI-only items → text description
  const imageUrls: string[] = [mannequinUrl]
  const clothingRefs: string[] = []
  let imgIdx = 2 // image 1 = mannequin base

  for (const item of items) {
    if (item.slot === "accessories") continue // skip accessories (not supported by try-on)
    const label = SLOT_LABEL[item.slot] || item.slot
    if (item.image_url && item.image_url.startsWith("http")) {
      imageUrls.push(item.image_url)
      clothingRefs.push(`图${imgIdx}的${label}`)
      imgIdx++
    } else {
      // AI-recommended item without photo: describe in text
      const desc = [item.name, item.pattern, item.material, item.fit, item.neckline]
        .filter(Boolean).join("，")
      clothingRefs.push(`${desc}的${label}`)
    }
  }

  const promptParts = [
    "图1是人物基底参考图。将图1人物的服装完整替换为以下服装：",
    clothingRefs.join("、") + "。",
    "严格按照每张参考图中的服装还原，包括图案纹理、面料质感、版型剪裁、颜色等所有细节。",
    "保持图1人物的面部五官、发型、肤色和手绘插画风格完全不变。",
    "保持图1的构图和人物比例完全不变——全身完整可见，头顶到脚尖都在画面内，不裁切。",
    "奶油纸纹背景，纯白底色，温暖治愈感。",
    angle === "back"
      ? "背面全身视图，不显示面部。不显示任何前襟、纽扣、领口等正面细节。"
      : "正面全身视图，A字站姿。",
    "不添加任何配饰、珠宝、眼镜、丝巾、手表、包袋等额外装饰。",
  ]

  return { imageUrls, prompt: promptParts.join(" ") }
}

// ─── Call Seedream 4.0 (with retry for intermittent Vercel HK → Beijing connectivity) ───
async function callSeedream(imageUrls: string[], prompt: string): Promise<Buffer> {
  const body = JSON.stringify({
    model: SEEDREAM_MODEL,
    prompt,
    image: imageUrls,
    size: "768x1152",
    watermark: false,
    response_format: "b64_json",
  })

  console.log(`[seedream] request: ${imageUrls.length} images, size=768x1152, prompt_len=${prompt.length}`)

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
        agent: new https.Agent({
          rejectUnauthorized: false,
          keepAlive: true,
          timeout: 30_000, // connection timeout
        }),
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
  if (!token) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
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
      console.log(`[generate-outfit] received: slot=${it.slot} name=${it.name} image_url=${it.image_url ? "yes" : "no"}`)
    }

    // ─── Cache check ───
    const key = outfitFingerprint(items, angleIndex, safeGender)
    const folder = hasUserItem(items) ? `u/${user.id}` : "g"
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
