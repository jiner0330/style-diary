import { NextRequest, NextResponse } from "next/server"
import https from "https"
import { createClient } from "@supabase/supabase-js"
import sharp from "sharp"

export const maxDuration = 60

const OFOXAI_KEY = process.env.OFOXAI_API_KEY!
const OFOXAI_BASE = process.env.OFOXAI_BASE_URL || "https://api.ofox.ai"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = "mannequins"

const AGENTS: Record<string, { face: string; hair: string; skin: string; body: string; pronoun: string; style: string }> = {
  female: {
    face: "Illustration-style face with big round amber eyes, doll-like delicate features, calm gentle expression.",
    hair: "Muted golden brown hair with a matte finish, pulled into a neat bun. Thin, smooth side-swept bangs swept evenly across the forehead with no parting. Soft wispy face-framing strands of hair at both sides of the bangs.",
    skin: "Translucent fair skin with a creamy porcelain finish.",
    body: "Slim build.",
    pronoun: "She",
    style: "A soft hand-drawn fashion illustration base figure, gentle watercolor shading but with crisp clean outlining, cream paper texture background, pure white background behind the paper texture, cozy and healing vibe. Game asset.",
  },
  male: {
    face: "Clean simple facial features with straight eyebrows, monolid eyes, thin lips, calm neutral expression, sharp jawline.",
    hair: "Hong Kong-style side-parted hairstyle, hair smoothly swept to one side from a clean defined side part on the left, moderate volume and height on top with natural movement, neatly tapered sides gradually fading shorter, clean edges around the ears and neckline, jet black with a healthy subtle sheen, polished yet effortless look.",
    skin: "Warm wheat-toned skin with a natural matte finish.",
    body: "Broad straight shoulders, square chest, straight waist without taper, narrow firm hips, subtle muscle definition on limbs without bulk.",
    pronoun: "He",
    style: "A soft hand-drawn fashion illustration base figure, gentle watercolor shading but with crisp clean outlining, cream paper texture background, pure white background behind the paper texture, cozy and healing vibe. Game asset.",
  },
}

function buildPrompt(gender: string, angle: string): string {
  const g = AGENTS[gender] || AGENTS.female

  const views: Record<string, string> = {
    front: `The figure is a young ${gender} mannequin, isolated full-body front view, standing in a symmetrical A-pose with arms held slightly away from the body, perfectly symmetrical, facing camera directly. ${g.face} ${g.hair} ${g.skin} ${g.body}`,
    back: `The figure is a young ${gender} mannequin, isolated full-body back view from behind, standing with arms resting naturally at sides, facing away from the camera. ${g.hair} ${g.skin} visible on neck, shoulders, and arms. ${g.body} No face visible.`,
  }

  return [
    g.style, "",
    views[angle] || views.front, "",
    `${g.pronoun} is wearing only a plain white long-sleeve bodysuit with full-length leggings — tight-fitting, no patterns, no details, no accessories.`,
    "",
    "Strictly no additional accessories, jewelry, patterns, or decorative elements.",
  ].join("\n")
}

export async function GET(request: NextRequest) {
  if (!OFOXAI_KEY || !SUPABASE_KEY) {
    return NextResponse.json({ ok: false, error: "Missing env vars" })
  }

  const { searchParams } = new URL(request.url)
  const gender = searchParams.get("gender") || "female"
  const angle = searchParams.get("angle") || "front"

  if (!["female", "male"].includes(gender) || !["front", "back"].includes(angle)) {
    return NextResponse.json({ ok: false, error: "Invalid params. Use ?gender=female|male&angle=front|back" })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  try { await supabase.storage.createBucket(BUCKET, { public: true }) } catch {}

  const path = `${gender}/${angle}.jpg`
  const { data: existing } = supabase.storage.from(BUCKET).getPublicUrl(path)
  // 如果已存在，跳过
  const check = await fetch(existing.publicUrl, { method: "HEAD" }).then(r => r.ok).catch(() => false)
  if (check) {
    return NextResponse.json({ ok: true, path, url: existing.publicUrl, cached: true })
  }

  try {
    const prompt = buildPrompt(gender, angle)
    console.log(`[mannequin] generating ${path}, prompt_len=${prompt.length}`)

    const imgRes = await fetch(`${OFOXAI_BASE}/v1/images/generations`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${OFOXAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-image-2", prompt, n: 1, size: "768x1152", response_format: "b64_json" }),
      signal: AbortSignal.timeout(55_000),
      agent: new https.Agent({ rejectUnauthorized: false }),
    } as any)

    if (!imgRes.ok) {
      const errText = await imgRes.text().catch(() => "")
      return NextResponse.json({ ok: false, error: `GPT Image failed: ${imgRes.status} ${errText.slice(0, 200)}` }, { status: 500 })
    }

    const data = await imgRes.json()
    const b64 = data.data?.[0]?.b64_json
    if (!b64) return NextResponse.json({ ok: false, error: "No image data" }, { status: 500 })

    const jpeg = await sharp(Buffer.from(b64, "base64")).jpeg({ quality: 90, progressive: true }).toBuffer()
    const { error } = await supabase.storage.from(BUCKET).upload(path, jpeg, { contentType: "image/jpeg", upsert: true })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ ok: true, path, url: urlData.publicUrl, cached: false })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
