const http = require("http")
const { createClient } = require("@supabase/supabase-js")
const sharp = require("sharp")

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// ─── Config ───
const VOLCENGINE_KEY = process.env.VOLCENGINE_KEY || ""
const VOLC_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/images/generations"
const SEEDREAM_MODEL = "doubao-seedream-4-0-250828"

const SUPABASE_URL = process.env.SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ""
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ""
const RENDER_BUCKET = "outfit-renders"
const MANNEQUIN_BUCKET = "mannequins"

// ─── Slot labels ───
const SLOT_LABEL = {
  dress: "连衣裙", top: "上衣", bottom: "下装",
  outerwear: "外套", shoes: "鞋子", bag: "包",
  accessories: "配饰",
}

const ANGLE_MAP = { 0: "front", 2: "back" }

// ─── Helpers ───
function getMannequinUrl(gender, angleIndex) {
  const angle = ANGLE_MAP[angleIndex] || "front"
  return `${SUPABASE_URL}/storage/v1/object/public/${MANNEQUIN_BUCKET}/${gender}/${angle}.jpg`
}

function resolveImageUrl(url) {
  if (!url) return ""
  if (url.startsWith("http")) return url
  if (url.startsWith("/")) return `https://dada-ai.cn${url}`
  return url
}

function outfitFingerprint(items, angleIndex, gender) {
  const sig = items
    .map((i) => i.image_url || `${i.slot}:${i.name}`)
    .sort().join("||")
  let hash = 0
  const str = `v17|${sig}|${angleIndex}|${gender}`
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(36)
}

function hasUserItem(items) {
  return items.some((i) => i.image_url && i.image_url.startsWith("http"))
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = ""
    req.on("data", (chunk) => { body += chunk.toString() })
    req.on("end", () => {
      try { resolve(JSON.parse(body)) } catch { resolve({}) }
    })
  })
}

function json(res, status, data) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(data))
}

// ─── Style → Hairstyle mapping ───
const HAIRSTYLE_FEMALE = {
  甜美: "蓬松双马尾",
  法式: "法式低盘发",
  优雅: "优雅低马尾",
  复古: "慵懒波浪卷发",
  街头: "高马尾",
  运动: "利落高马尾",
  简约: "柔顺直发披肩",
  通勤: "干练低马尾",
  商务休闲: "侧分锁骨发",
  个性: "不对称短发",
}
const HAIRSTYLE_MALE = {
  街头: "凌乱纹理短发",
  运动: "利落寸头",
  简约: "清爽短碎发",
  通勤: "干练短发",
  商务休闲: "侧分油头",
  个性: "中分微卷发",
  复古: "慵懒纹理卷发",
}
const DEFAULT_HAIR = { female: "自然丸子头", male: "清爽短碎发" }

function pickHairstyle(items, gender) {
  const map = gender === "male" ? HAIRSTYLE_MALE : HAIRSTYLE_FEMALE
  const seen = new Set()
  // Collect all style tags across items
  for (const item of items) {
    const tags = item.style_tags
    if (!tags || !Array.isArray(tags)) continue
    for (const t of tags) {
      if (map[t]) seen.add(t)
    }
  }
  if (seen.size > 0) {
    // Pick the first matched tag (priority in map order)
    for (const key of Object.keys(map)) {
      if (seen.has(key)) return map[key]
    }
  }
  return DEFAULT_HAIR[gender] || DEFAULT_HAIR.female
}

// ─── Build Seedream payload ───
function buildSeedreamPayload(items, angleIndex, gender) {
  const angle = ANGLE_MAP[angleIndex] || "front"
  const mannequinUrl = getMannequinUrl(gender, angleIndex)

  const imageUrls = [mannequinUrl]
  const clothingRefs = []
  let imgIdx = 2

  for (const item of items) {
    if (item.slot === "accessories" && !item.image_url) continue
    const label = SLOT_LABEL[item.slot] || item.slot
    if (item.image_url) {
      imageUrls.push(resolveImageUrl(item.image_url))
      clothingRefs.push(`图${imgIdx}的${label}`)
      imgIdx++
    } else {
      const desc = [item.name, item.pattern, item.material, item.fit, item.neckline]
        .filter(Boolean).join("，")
      clothingRefs.push(`${desc}的${label}`)
    }
  }

  const hairstyle = pickHairstyle(items, gender)

  const promptParts = [
    "图1是人物基底参考图。将图1人物的服装完整替换为以下服装：",
    clothingRefs.join("、") + "。",
    "严格按照每张参考图中的服装还原，包括图案纹理、面料质感、版型剪裁、颜色等所有细节。",
    `保持图1人物的面部五官、肤色和手绘插画风格完全不变。将发型改为：${hairstyle}。`,
    "保持图1的构图和人物比例完全不变——全身完整可见，头顶到脚尖都在画面内，不裁切。",
    "奶油纸纹背景，纯白底色，温暖治愈感。",
    angle === "back"
      ? "背面全身视图，不显示面部。不显示任何前襟、纽扣、领口等正面细节。"
      : "正面全身视图，A字站姿。",
    "如果有配饰参考图（眼镜、手表、项链等），保持其款式和位置还原到图1人物对应位置。",
  ]

  return { imageUrls, prompt: promptParts.join(" ") }
}

// ─── Call Seedream 4.0 ───
async function callSeedream(imageUrls, prompt) {
  const body = JSON.stringify({
    model: SEEDREAM_MODEL,
    prompt,
    image: imageUrls,
    size: "1280x1920",
    watermark: false,
    response_format: "b64_json",
  })

  console.log(`[seedream] request: ${imageUrls.length} images, size=1280x1920, prompt_len=${prompt.length}`)

  let lastErr = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 55_000)

      const res = await fetch(VOLC_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${VOLCENGINE_KEY}`,
          "Content-Type": "application/json",
        },
        body,
        signal: controller.signal,
      })

      clearTimeout(timer)

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
    } catch (err) {
      lastErr = err
      const msg = err.message.slice(0, 150)
      if (attempt < 2) {
        console.warn(`[seedream] attempt ${attempt + 1} failed, retrying in 2s:`, msg)
        await new Promise((r) => setTimeout(r, 2000))
      }
    }
  }
  throw lastErr
}

// ─── Server ───
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method === "GET") {
    return json(res, 200, { ok: true, service: "generate-outfit" })
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" })
  }

  const t0 = Date.now()

  try {
    if (!VOLCENGINE_KEY) {
      return json(res, 500, { error: "服务器未配置 VOLCENGINE_API_KEY" })
    }

    const body = await parseBody(req)
    const { items, gender, angleIndex } = body

    if (!items || items.length === 0) {
      return json(res, 400, { error: "请选择至少一件单品" })
    }

    const angle = angleIndex ?? 0
    const safeGender = gender === "male" ? "male" : "female"
    const userId = body.userId || "guest"

    console.log(`[generate-outfit] ${items.length} items, gender=${safeGender}, angle=${angle}`)

    // ─── Cache check ───
    const key = outfitFingerprint(items, angle, safeGender)
    const folder = hasUserItem(items) ? `u/${userId}` : "g"
    const objectPath = `${folder}/${key}.jpg`

    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: urlData } = supabaseAnon.storage.from(RENDER_BUCKET).getPublicUrl(objectPath)
    const publicUrl = urlData.publicUrl

    const cached = await fetch(publicUrl, { method: "HEAD" }).then((r) => r.ok).catch(() => false)
    if (cached) {
      console.log("[generate-outfit] cache hit:", objectPath)
      return json(res, 200, {
        status: "done",
        imageUrl: publicUrl,
        prompt: buildSeedreamPayload(items, angle, safeGender).prompt,
        mode: "seedream",
        cached: true,
      })
    }

    // ─── Generate ───
    console.log(`[generate-outfit] cache miss, generating...`)
    const { imageUrls, prompt } = buildSeedreamPayload(items, angle, safeGender)
    const generatedBuffer = await callSeedream(imageUrls, prompt)

    console.log(`[generate-outfit] generated in ${Date.now() - t0}ms`)

    // ─── Watermark ───
    const watermarkSvg = `<svg width="260" height="44" xmlns="http://www.w3.org/2000/svg">
      <text x="250" y="30" font-family="sans-serif" font-size="15" fill="#8B7355" opacity="0.40" text-anchor="end">搭配 by 搭搭</text>
    </svg>`

    // ─── Compress & cache ───
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const jpegBuffer = await sharp(generatedBuffer)
      .composite([{
        input: Buffer.from(watermarkSvg),
        top: 1920 - 44 - 28,
        left: 1280 - 260 - 28,
      }])
      .jpeg({ quality: 85, progressive: true })
      .toBuffer()

    const { error: upErr } = await supabaseAdmin.storage
      .from(RENDER_BUCKET)
      .upload(objectPath, jpegBuffer, { contentType: "image/jpeg", upsert: true })

    if (upErr) {
      console.warn("[generate-outfit] cache upload failed, returning inline:", upErr.message)
      return json(res, 200, {
        status: "done",
        imageUrl: `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`,
        prompt,
        mode: "seedream",
      })
    }

    console.log(`[generate-outfit] cached: ${objectPath} (${(jpegBuffer.length / 1024).toFixed(0)}KB)`)
    return json(res, 200, {
      status: "done",
      imageUrl: publicUrl,
      prompt,
      mode: "seedream",
    })
  } catch (err) {
    console.error("[generate-outfit] error:", err)
    return json(res, 500, {
      error: `生成失败：${err.message.slice(0, 200)}`,
    })
  }
})

const port = process.env.FC_SERVER_PORT || 9000
server.listen(port, () => {
  console.log(`[generate-outfit] listening on ${port}`)
})
