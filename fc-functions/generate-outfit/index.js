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

// ─── Accessory compositing layout (pixel coords at 1280×1920) ───
// Each sub_category maps to { cx, cy, w, h } — center point + target size
const ACCESSORY_LAYOUT = {
  sunglasses: { cx: 640, cy: 325, w: 190, h: 75 },
  earrings: {
    left:  { cx: 535, cy: 345, w: 38, h: 55 },
    right: { cx: 745, cy: 345, w: 38, h: 55 },
  },
  necklace:  { cx: 640, cy: 460, w: 150, h: 100 },
  scarf:     { cx: 640, cy: 480, w: 175, h: 110 },
  watch: {
    left:  { cx: 370, cy: 980, w: 78, h: 55 },
    right: { cx: 910, cy: 980, w: 78, h: 55 },
  },
  belt: { cx: 640, cy: 1050, w: 195, h: 55 },
  hat:  { cx: 640, cy: 195, w: 210, h: 125 },
}

// Sub-categories not visible from back view
const BACK_HIDDEN = new Set(["sunglasses", "earrings", "necklace", "scarf", "watch"])

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

// ─── Accessory compositing ───
async function removeWhiteBackground(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    // Pixels where R,G,B are all > 245 → transparent
    if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) {
      data[i + 3] = 0
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 }
  }).png().toBuffer()
}

async function compositeAccessories(baseBuffer, accessoryItems, gender, angle) {
  const composites = []

  for (const item of accessoryItems) {
    if (!item.image_url) continue
    const sub = item.sub_category
    if (!sub || !ACCESSORY_LAYOUT[sub]) {
      console.log(`[composite] skip ${item.name}: unknown sub_category "${sub}"`)
      continue
    }

    // Back view hides most accessories
    if (angle === "back" && BACK_HIDDEN.has(sub)) continue

    let layout = ACCESSORY_LAYOUT[sub]
    // Handle side-specific accessories (earrings, watch)
    if (layout.left && layout.right) {
      // Default to left side if not specified
      layout = layout.left
    }

    try {
      const url = resolveImageUrl(item.image_url)
      console.log(`[composite] downloading ${item.name}: ${url}`)
      const accRes = await fetch(url)
      if (!accRes.ok) {
        console.warn(`[composite] download failed for ${item.name}: ${accRes.status}`)
        continue
      }

      let accBuffer = Buffer.from(await accRes.arrayBuffer())
      // Remove white background for clean overlay
      accBuffer = await removeWhiteBackground(accBuffer)

      // Resize to target dimensions
      accBuffer = await sharp(accBuffer)
        .resize(layout.w, layout.h, { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer()

      // Calculate top-left from center point
      const left = Math.round(layout.cx - layout.w / 2)
      const top = Math.round(layout.cy - layout.h / 2)

      composites.push({ input: accBuffer, top, left, blend: "over" })
      console.log(`[composite] ${item.name} → (${left}, ${top}) ${layout.w}×${layout.h}`)
    } catch (err) {
      console.warn(`[composite] error processing ${item.name}:`, err.message)
    }
  }

  if (composites.length === 0) return baseBuffer

  return sharp(baseBuffer)
    .composite(composites)
    .jpeg({ quality: 92, progressive: true })
    .toBuffer()
}

// ─── Build Seedream payload ───
const ACCESSORY_POSITION = {
  sunglasses: "佩戴在眼部，镜框覆盖双眼",
  earrings:   "佩戴在耳垂下方，左右各一只",
  necklace:   "佩戴在颈部锁骨位置",
  watch:      "佩戴在左手手腕处",
  belt:       "系在腰间裤腰位置",
  hat:        "戴在头顶",
  scarf:      "系在颈部",
  bag:        "挎在肩部或手提",
}

function buildSeedreamPayload(items, angleIndex, gender) {
  const angle = ANGLE_MAP[angleIndex] || "front"
  const mannequinUrl = getMannequinUrl(gender, angleIndex)

  const imageUrls = [mannequinUrl]
  const clothingRefs = []
  const accessoryDescs = []
  let imgIdx = 2

  const clothingSlots = new Set(["dress", "top", "bottom", "outerwear", "shoes", "bag"])

  for (const item of items) {
    // Accessories: describe in text with precise positioning (Seedream can't use product images)
    if (item.slot === "accessories") {
      const parts = []
      if (item.name) parts.push(item.name)
      if (item.color) parts.push(item.color)
      if (item.material) parts.push(item.material)
      if (item.detail) parts.push(item.detail)
      const desc = parts.join("，")
      const pos = (item.sub_category && ACCESSORY_POSITION[item.sub_category])
        ? ACCESSORY_POSITION[item.sub_category]
        : ""
      if (desc) accessoryDescs.push(`${desc}，${pos}`)
      continue
    }

    if (!clothingSlots.has(item.slot)) continue
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
  ]

  // Append accessory descriptions as precise text placement instructions
  if (accessoryDescs.length > 0) {
    promptParts.push(
      "人物同时佩戴以下配饰，请精准绘制在对应身体位置：",
      accessoryDescs.map((d, i) => `${i + 1}. ${d}`).join("；") + "。",
      "配饰的款式、颜色、材质需严格按上述描述还原，位置必须准确。"
    )
  }

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

    // ─── Compress & cache ───
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const jpegBuffer = await sharp(generatedBuffer)
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
