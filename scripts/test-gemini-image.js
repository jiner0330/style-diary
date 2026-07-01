/**
 * Test script: reference-image outfit generation via ofox.ai
 *
 * Tests multiple image generation models to find one that:
 * 1. Accepts reference clothing photos as input
 * 2. Returns generated image in the response
 * 3. Faithfully reproduces clothing details from references
 */
const https = require("https")
const fs = require("fs")
const path = require("path")

const OFOXAI_KEY = process.env.OFOXAI_API_KEY || "sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu"
const OFOXAI_BASE = process.env.OFOXAI_BASE_URL || "https://api.ofox.ai"
const agent = new https.Agent({ rejectUnauthorized: false })

const IMAGES = [
  // Blue bodycon tank dress
  "https://vklltmfmttuaahqmwksu.supabase.co/storage/v1/object/public/wardrobe/10c34975-8462-4b72-8a9e-70696559c9f4/aa4fd4a8-08e8-4fcb-b3c8-16e3eb4c83e6.jpeg",
  // Black-white checked irregular hem skirt
  "https://vklltmfmttuaahqmwksu.supabase.co/storage/v1/object/public/wardrobe/10c34975-8462-4b72-8a9e-70696559c9f4/e8e20649-149c-4167-bd32-6d4eb16e308a.jpeg",
]

const PROMPT = `A soft hand-drawn fashion illustration base figure, gentle watercolor shading with crisp clean outlining, cream paper texture background, pure white background behind the paper texture, cozy and healing vibe. Game asset.

The figure is a young female mannequin, isolated full-body front view, standing in a symmetrical A-pose, facing camera directly. Illustration-style face, big round amber eyes, doll-like delicate features. Muted golden brown hair in a neat bun, thin side-swept bangs. Translucent fair skin, slim build.

She is wearing:
- A pale blue body-hugging bodycon dress with thin spaghetti straps, tightly fitted through bust waist and hips, knit fabric. The first reference image shows the exact dress.
- A black-white checked A-line skirt with irregular asymmetrical hem. The second reference image shows the exact skirt.

CRITICAL: Use the reference images. The dress neckline, strap style, length, and fit MUST match the first reference photo. The skirt pattern, hem shape, and silhouette MUST match the second reference photo.`

async function testModelChat(model) {
  console.log(`\n=== Testing ${model} ===`)
  const modelSlug = model.replace(/\//g, "-")

  // 1. Download images as base64
  const imageParts = []
  for (let i = 0; i < IMAGES.length; i++) {
    const res = await fetch(IMAGES[i], { agent })
    const buf = Buffer.from(await res.arrayBuffer())
    const b64 = buf.toString("base64")
    const mime = IMAGES[i].endsWith(".png") ? "image/png" : "image/jpeg"
    imageParts.push({
      type: "image_url",
      image_url: { url: `data:${mime};base64,${b64}` },
    })
  }

  // 2. Call chat completions
  const t0 = Date.now()
  const res = await fetch(`${OFOXAI_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OFOXAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, ...imageParts] }],
      max_tokens: 4096,
    }),
    agent,
  })

  const rawText = await res.text()
  console.log(`  Status: ${res.status}, ${rawText.length} bytes, ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  // Save raw
  fs.writeFileSync(path.join(__dirname, `test-${modelSlug}-raw.txt`), rawText.slice(0, 10000))

  if (!res.ok) {
    console.log(`  Error: ${rawText.slice(0, 300)}`)
    return null
  }

  const data = JSON.parse(rawText)
  fs.writeFileSync(path.join(__dirname, `test-${modelSlug}.json`), JSON.stringify(data, null, 2))

  // Try to extract image
  const choice = data.choices?.[0]
  const msg = choice?.message
  console.log(`  Finish: ${choice?.finish_reason}, usage: ${JSON.stringify(data.usage)}`)

  // Format: choices[0].message.content as array
  if (Array.isArray(msg?.content)) {
    for (const part of msg.content) {
      const imgUrl = part.image_url?.url || part.url || ""
      if (imgUrl.startsWith("data:")) {
        const [h, b64] = imgUrl.split(",")
        const ext = h.includes("png") ? "png" : "jpg"
        const out = path.join(__dirname, `test-${modelSlug}.${ext}`)
        fs.writeFileSync(out, Buffer.from(b64, "base64"))
        console.log(`  [IMAGE] ${out} (${(b64.length / 1024).toFixed(0)}KB)`)
        return out
      }
    }
  }

  // Format: choices[0].message.content as string with base64
  if (typeof msg?.content === "string" && msg.content.includes("data:image")) {
    console.log(`  Content contains embedded data:image, length=${msg.content.length}`)
  }

  // Format: data[0].b64_json
  if (data.data?.[0]?.b64_json) {
    const out = path.join(__dirname, `test-${modelSlug}.jpg`)
    fs.writeFileSync(out, Buffer.from(data.data[0].b64_json, "base64"))
    console.log(`  [IMAGE-gen] ${out}`)
    return out
  }

  // Format: data[0].url
  if (data.data?.[0]?.url) {
    console.log(`  [URL] ${data.data[0].url}`)
    return data.data[0].url
  }

  // Gemini native format embedded in OpenAI response
  const parts = data.candidates?.[0]?.content?.parts
  if (parts) {
    for (const part of parts) {
      if (part.inlineData) {
        const { mimeType, data: b64 } = part.inlineData
        const ext = mimeType?.includes("png") ? "png" : "jpg"
        const out = path.join(__dirname, `test-${modelSlug}.${ext}`)
        fs.writeFileSync(out, Buffer.from(b64, "base64"))
        console.log(`  [IMAGE-gemini] ${out}`)
        return out
      }
    }
  }

  console.log(`  No image found. Keys: ${Object.keys(data).join(", ")}`)
  if (msg?.content && typeof msg.content === "string") {
    console.log(`  Text content: ${msg.content.slice(0, 200)}`)
  }
  return null
}

async function testModelImages(model) {
  console.log(`\n=== Testing ${model} via images/generations ===`)
  const modelSlug = model.replace(/\//g, "-")
  const t0 = Date.now()

  const res = await fetch(`${OFOXAI_BASE}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OFOXAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: PROMPT,
      n: 1,
      size: "1920x1920",
      response_format: "b64_json",
    }),
    agent,
  })

  const rawText = await res.text()
  console.log(`  Status: ${res.status}, ${rawText.length} bytes, ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  fs.writeFileSync(path.join(__dirname, `test-${modelSlug}-raw.txt`), rawText.slice(0, 5000))

  if (!res.ok) { console.log(`  Error: ${rawText.slice(0, 300)}`); return null }

  const data = JSON.parse(rawText)
  fs.writeFileSync(path.join(__dirname, `test-${modelSlug}.json`), JSON.stringify(data, null, 2))

  if (data.data?.[0]?.b64_json) {
    const out = path.join(__dirname, `test-${modelSlug}.jpg`)
    fs.writeFileSync(out, Buffer.from(data.data[0].b64_json, "base64"))
    console.log(`  [IMAGE] ${out} (${(data.data[0].b64_json.length / 1024).toFixed(0)}KB)`)
    return out
  }
  if (data.data?.[0]?.url) {
    console.log(`  [URL] ${data.data[0].url}`)
    return data.data[0].url
  }

  console.log(`  Keys: ${Object.keys(data).join(", ")}`)
  return null
}

async function testModelEdits(model) {
  console.log(`\n=== Testing ${model} via images/edits ===`)
  const modelSlug = model.replace(/\//g, "-")

  // Download reference images
  const imageBufs = []
  for (const url of IMAGES) {
    const res = await fetch(url, { agent })
    imageBufs.push(Buffer.from(await res.arrayBuffer()))
    console.log(`  Downloaded: ${url.slice(-30)} (${(imageBufs[imageBufs.length-1].length/1024).toFixed(0)}KB)`)
  }

  // Build multipart body
  const boundary = "----Ofox" + Math.random().toString(36).slice(2)
  const crlf = "\r\n"
  const parts = []

  const field = (name, value) => {
    parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="${name}"${crlf}${crlf}${value}${crlf}`))
  }

  field("model", model)
  field("prompt", PROMPT)
  field("quality", "high")
  field("n", "1")
  field("size", "1920x1920")
  field("response_format", "b64_json")

  for (let i = 0; i < imageBufs.length; i++) {
    const buf = imageBufs[i]
    parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="image"; filename="ref_${i}.jpg"${crlf}Content-Type: image/jpeg${crlf}${crlf}`))
    parts.push(buf)
    parts.push(Buffer.from(crlf))
  }
  parts.push(Buffer.from(`--${boundary}--${crlf}`))

  const t0 = Date.now()
  const res = await fetch(`${OFOXAI_BASE}/v1/images/edits`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OFOXAI_KEY}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: Buffer.concat(parts),
    agent,
  })

  const rawText = await res.text()
  console.log(`  Status: ${res.status}, ${rawText.length} bytes, ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  fs.writeFileSync(path.join(__dirname, `test-${modelSlug}-edits-raw.txt`), rawText.slice(0, 5000))

  if (!res.ok) { console.log(`  Error: ${rawText.slice(0, 300)}`); return null }

  const data = JSON.parse(rawText)
  if (data.data?.[0]?.b64_json) {
    const out = path.join(__dirname, `test-${modelSlug}-edits.jpg`)
    fs.writeFileSync(out, Buffer.from(data.data[0].b64_json, "base64"))
    console.log(`  [IMAGE] ${out} (${(data.data[0].b64_json.length / 1024).toFixed(0)}KB)`)
    return out
  }
  if (data.data?.[0]?.url) {
    console.log(`  [URL] ${data.data[0].url}`)
    return data.data[0].url
  }
  console.log(`  Keys: ${Object.keys(data).join(", ")}`)
  return null
}

async function main() {
  console.log("=== Reference Image Generation Test ===\n")

  const models = [
    { id: "openai/gpt-image-2", ep: "edits" },
  ]

  for (const { id: model, ep } of models) {
    let result = null
    if (ep === "images") result = await testModelImages(model)
    else if (ep === "edits") result = await testModelEdits(model)
    else result = await testModelChat(model)
    if (result) {
      console.log(`\n*** SUCCESS: ${model} → ${result} ***`)
      return
    }
  }

  console.log("\n*** No model returned usable images ***")
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
