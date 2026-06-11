import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import https from "https"
import path from "path"
import { requireAuth } from "@/lib/auth"

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

const SEEDREAM_KEY = process.env.SEEDREAM_API_KEY!
const SEEDREAM_BASE = process.env.SEEDREAM_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3"
const MODEL = process.env.SEEDREAM_MODEL || "doubao-seedream-4-5-251128"

interface AIOutfitItem {
  slot: string
  name: string
  category: string
  sub_category: string
  color: string
  material?: string
  fit?: string
  length?: string
  neckline?: string
  detail?: string
  style_tags: string[]
}

// ---- Silhouette descriptions ----
const SUBCAT_SHAPE: Record<string, string> = {
  sweater: "knit sweater, relaxed fit, soft textured fabric, ribbed crew neckline, long sleeves with ribbed cuffs and hem",
  shirt: "button-up collared shirt, structured pointed collar, long sleeves with buttoned cuffs, straight hem, chest pocket",
  blouse: "fitted feminine blouse, tailored waist, soft drape, subtle neckline",
  cardigan: "open-front cardigan draping loosely from the shoulders, no buttons, relaxed open silhouette",
  hoodie: "hooded sweatshirt with a drawstring hood, front kangaroo pocket, relaxed fit, ribbed cuffs and hem",
  sweatshirt: "crewneck sweatshirt, round neckline, dropped shoulder, relaxed fit, ribbed cuffs and hem, no hood",
  henley: "henley shirt with a short button placket at the chest, round neckline, long sleeves, relaxed fit",
  turtleneck: "turtleneck with a tall folded funnel collar covering the neck, slim fit, long sleeves",
  off_shoulder_corset: "off-shoulder corset-style bodice, straight neckline sitting below the shoulders exposing the collarbone, structured vertical boning seams with criss-cross lace-up front, fitted cinched waist, slim cropped silhouette, long fitted sleeves",
  halter: "halter neck top with a strap wrapping behind the neck, open back, bare shoulders and arms, fitted bodice with a slightly loose hem",
  off_shoulder_ls: "off-shoulder long-sleeve top, neckline sitting below the shoulders exposing the collarbone, fitted long sleeves, slim silhouette",
  puff_sleeve: "square neckline top with voluminous puffy short sleeves gathered into fitted cuffs, cropped waist-length hem",
  off_shoulder_tee: "off-shoulder fitted short-sleeve t-shirt, straight neckline below the shoulders, cap sleeves, slim cropped silhouette",
  tank: "sleeveless V-neck camisole tank top, thin shoulder straps, relaxed fit, lightweight fabric",
  jeans: "straight-leg jeans, mid to high rise, classic five-pocket design, zip fly, straight cut from hip to ankle",
  trousers: "wide-leg tailored trousers, high-waisted, loose flowing wide legs from hip to hem, front pleats, side pockets",
  skirt: "A-line skirt, fitted at the natural waist, flaring gently to the hem, knee to midi length",
  shorts: "high-waisted shorts, relaxed fit through the leg, folded cuff hem, side pockets, zip fly",
  cargo: "cargo pants, relaxed straight-leg fit, multiple utility patch pockets on the thighs and sides, belt loops",
  chinos: "slim-fit chinos, tapered leg, mid-rise, slash front pockets, clean minimal design",
  wide_jeans: "high-waist wide-leg jeans, loose and relaxed from hip to ankle, oversized silhouette, five-pocket styling",
  mermaid_skirt: "fishtail mermaid skirt, fitted through the hips and thighs, flaring dramatically at the knee into a trumpet hem, maxi length",
  pencil_skirt: "pencil skirt, slim straight cut, fitted from waist to knee or below, back slit, office-ready silhouette",
  tiered_tulle_skirt: "layered tiered tulle skirt, multiple stacked horizontal ruffled layers, soft gathered texture",
  a_line_skirt: "A-line skirt, fitted at the natural waist, flaring gently outward to the hem",
  pleated_skirt: "pleated skirt, evenly pressed fine pleats from waistband falling straight, structured folds",
  mini: "mini dress, short hemline above the knee, fitted or flared silhouette",
  midi: "midi dress, hemline falling between knee and ankle, feminine silhouette",
  maxi: "maxi dress, full-length hemline to the ankles, flowing or fitted silhouette",
  off_shoulder_dress: "off-shoulder dress, neckline sitting below the shoulders, fitted waist, flared or straight skirt, feminine silhouette",
  qipao: "Chinese qipao cheongsam dress, small mandarin stand-up collar, diagonal front placket with knotted frog button closures, slim fitted silhouette, side slit at the lower hem, elegant traditional tailoring",
  blazer: "tailored blazer, structured shoulders, notched lapels, single-breasted button front, flap pockets, long sleeves",
  jacket: "cropped jacket hitting at the waist, boxy fit, front zipper or button closure, long sleeves",
  trench: "long trench coat, double-breasted button front, notched lapels, belted waist, epaulettes on shoulders, knee-length or longer",
  bomber: "cropped bomber jacket, ribbed stand collar, ribbed cuffs and hem, front zip, long sleeves",
  sneakers: "low-top flat lace-up sneakers, rounded toe, casual rubber sole",
  heels: "pointed-toe stiletto high heels, slim ankle strap, thin tall heel",
  boots: "lace-up combat boots, ankle to mid-calf height, chunky lug sole, round toe",
  loafers: "flat slip-on loafers, almond toe, low stacked heel, penny strap or plain upper",
  tote: "large open-top tote bag, two shoulder straps, unstructured slouchy shape, spacious interior",
  shoulder: "small chain shoulder bag, flap front closure, compact rectangular shape, thin chain strap",
}

// Per-item negative features — inlined into prompt since v3 API ignores negative_prompt for 4.5
const NEGATIVE_FEATURES: Record<string, string> = {
  sweater: "hood, zipper, buttons, collar",
  shirt: "hood, turtleneck, crew neck, stretchy fabric",
  blouse: "hood, zipper, turtleneck, crew neck",
  cardigan: "zipper, hood, tight fit, buttons done up",
  hoodie: "collar, buttons, turtleneck",
  sweatshirt: "hood, buttons, collar, zipper",
  henley: "crew neck, turtleneck, zipper, full button placket",
  turtleneck: "crew neck, V-neck, bare neck, exposed collarbone, deep neckline",
  off_shoulder_corset: "halter neck, crew neck, turtleneck, shoulder straps, high neckline covering shoulders, sleeveless, tank top",
  halter: "off-shoulder, turtleneck, crew neck, sleeves, shoulder straps",
  off_shoulder_ls: "halter neck, crew neck, turtleneck, shoulder straps covering shoulders, sleeveless, tank top, cap sleeves, short sleeves, bare arms, straps",
  puff_sleeve: "long tight sleeves, sleeveless, halter neck, turtleneck, flat sleeves without volume",
  off_shoulder_tee: "halter neck, crew neck, turtleneck, shoulder straps, long sleeves",
  tank: "long sleeves, turtleneck, crew neck, collar, thick straps",
  jeans: "pleats, elastic waistband, cargo pockets, shorts length, skirt",
  trousers: "jeans denim, cargo pockets, shorts length, tight skinny fit",
  skirt: "pants, shorts, jeans, trousers",
  shorts: "long pants, skirt, jeans, ankle length",
  cargo: "formal dress pants, tight fit, skirt",
  chinos: "jeans denim, cargo pockets, shorts length",
  wide_jeans: "tight skinny fit, tapered leg, shorts length, skirt",
  mermaid_skirt: "short mini length, straight cut, pants, shorts",
  pencil_skirt: "flared hem, wide leg, mini length, pants",
  mini: "midi length, maxi length, ankle length, calf length, long dress",
  midi: "mini length above knee, ankle length maxi, short dress",
  maxi: "mini length, above knee, midi length, short dress",
  off_shoulder_dress: "halter neck, crew neck, turtleneck, shoulder straps, straps covering shoulders",
  blazer: "hood, zipper, elastic cuffs, sweatpants, casual sporty",
  jacket: "hood, formal blazer, turtleneck collar",
  trench: "short length, hood, zipper, puffer, sporty",
  bomber: "formal blazer, trench length, hood, turtleneck",
  sneakers: "heels, pointed toe, formal leather, boots",
  heels: "flat sole, sneakers, boots, round toe, chunky sole",
  boots: "heels, open toe, sandals, flats",
  loafers: "heels, laces, sneakers, boots, open toe",
  tote: "clutch, backpack straps, structured boxy shape, small size",
  shoulder: "backpack, tote, large bag, crossbody strap, briefcase",
}

function describeColor(hex: string): string {
  const map: Record<string, string> = {
    "#F5F5F5": "white", "#FAF7F4": "cream white", "#E8E4DF": "off-white",
    "#3A3A3A": "black", "#2A2A2A": "black", "#5C5C5C": "dark gray",
    "#9A9A9A": "gray", "#B5C1B4": "sage green", "#A8C4D4": "pale blue",
    "#D4C5C2": "dusty rose", "#D4C5A0": "beige", "#C5BFB8": "taupe",
    "#A3B5C4": "slate blue", "#B4C1A8": "olive green", "#C4A8A3": "muted rose",
    "#D4A5A5": "mauve", "#E8DED1": "cream", "#6B8FA3": "blue",
    "#7B9CB5": "denim blue", "#3A5A3A": "forest green", "#5C3A2A": "dark brown",
    "#8B2252": "burgundy red", "#E8B4B8": "pink", "#E8D8A0": "butter yellow",
    "#DDA040": "mustard yellow", "#1A2A4A": "navy", "#F5F0D0": "pale yellow",
    "#E8C8B0": "nude", "#C4886A": "warm terracotta", "#F5F0E8": "cream white",
    "#8A8A8A": "gray", "#4A6B8A": "indigo blue", "#8A7A5A": "olive khaki",
    "#D4C8B8": "warm beige", "#D4D4D4": "silver", "#D4B060": "gold", "#D4A8A0": "rose gold", "#E8C4C9": "misty pink", "#C1D8C3": "fresh green",
    "#F5E68C": "lemon yellow",
    "#88C8A0": "bright green", "#50B878": "jade green", "#98D8B8": "mint green",
    "#78C850": "grass green", "#B8E888": "neon lime", "#2A5A2A": "dark green",
    "#7EC8A0": "teal green",
  }
  return map[hex] || hex
}

const MATERIAL_TEXTURE: Record<string, string> = {
  "欧根纱": "organza fabric, crisp and matte",
  "真丝": "silk fabric, subtle sheen and fluid drape",
  "丝绸": "silk fabric, soft sheen and drape",
  "雪纺": "chiffon fabric, soft and flowy",
  "棉": "cotton fabric, clean finish",
  "纯棉": "pure cotton fabric, clean finish",
  "亚麻": "linen fabric, natural texture",
  "牛仔": "denim fabric, twill weave",
  "针织": "knit fabric, soft and stretchy",
  "羊毛": "wool fabric, fuzzy surface",
  "羊毛混纺": "wool blend fabric, crisp structured texture",
  "羊绒": "cashmere fabric, fine soft texture",
  "皮革": "leather fabric",
  "蕾丝": "lace fabric",
  "纱": "tulle fabric, sheer",
  "毛呢": "wool tweed fabric, structured",
  "聚酯": "polyester fabric, smooth and crisp",
  "尼龙": "nylon fabric, smooth and lightweight",
  "帆布": "canvas fabric, durable and textured",
  "棉+氨纶": "cotton-spandex blend fabric, clean finish with stretch",
  "氨纶": "spandex fabric, stretchy and form-fitting",
  "薄纱": "sheer gauze fabric, lightweight and translucent",
  "混纺": "blended fabric, smooth drape",
  "缎面": "satin fabric, subtle luster and smooth drape",
  "醋酸": "acetate fabric, silky drape with matte finish",
  "金属": "metal, polished metallic finish",
  "珍珠": "pearl, smooth lustrous surface",
  "塑料": "plastic, glossy or matte finish",
  "麂皮": "suede fabric, soft napped surface",
  "亮片": "sequin fabric, covered entirely in small shiny flat reflective disks, sparkling and glittering under light",
  "灯芯绒": "corduroy fabric, fine ribbed waled texture",
  "天鹅绒": "velvet fabric, soft dense piled surface with deep luster",
  "丝绒": "velvet fabric, soft dense piled surface with deep luster",
  "毛线": "wool yarn knit fabric, thick and textured",
  "PU": "PU faux leather fabric, glossy synthetic leather look",
  "人造革": "faux leather fabric, synthetic leather surface",
  "网纱": "mesh fabric, fine open net structure, sheer and translucent",
  "棉麻": "cotton-linen blend fabric, natural texture with subtle slubs",
  "抓绒": "polar fleece fabric, soft fuzzy napped surface",
  "漆皮": "patent leather fabric, high-gloss lacquered shiny surface",
}

const FIT_EN: Record<string, string> = {
  "紧身": "skin-tight fit", "修身": "slim fit", "合身": "regular fit",
  "宽松": "loose relaxed fit", "oversized": "oversized fit",
}
const LENGTH_EN: Record<string, string> = {
  "短款": "cropped length", "常规": "regular length",
  "中长": "midi length", "长款": "full length",
}
const NECKLINE_EN: Record<string, string> = {
  "圆领": "round crew neckline", "V领": "V-neckline", "方领": "square neckline",
  "高领": "high neckline", "翻领": "lapel collar", "一字肩": "off-shoulder neckline",
  "吊带": "spaghetti straps", "无领": "collarless",
}

function describeItem(i: AIOutfitItem): string {
  const color = describeColor(i.color)
  const material = i.material || ""
  const shape = (i.sub_category && SUBCAT_SHAPE[i.sub_category]) || ""
  const detail = i.detail || ""
  const styleTags = i.style_tags || []

  const parts: string[] = []
  if (shape) {
    parts.push(`${color} ${shape}`)
  } else {
    parts.push(`${color} ${i.name}`)
  }
  if (material) {
    parts.push(MATERIAL_TEXTURE[material] || `${material} fabric`)
  }
  if (detail) {
    parts.push(detail)
  }
  if (i.fit && FIT_EN[i.fit]) {
    parts.push(FIT_EN[i.fit])
  }
  if (i.length && LENGTH_EN[i.length]) {
    parts.push(LENGTH_EN[i.length])
  }
  if (i.neckline && NECKLINE_EN[i.neckline]) {
    parts.push(NECKLINE_EN[i.neckline])
  }
  if (styleTags.length > 0) {
    parts.push(`${styleTags.join(", ")} style`)
  }
  return parts.join(". ") + "."
}

const SLOT_LABEL: Record<string, string> = {
  dress: "Dress", top: "Top", bottom: "Bottom",
  outerwear: "Outerwear", shoes: "Shoes", bag: "Bag",
  accessories: "Accessory",
}

const STYLE_INTRO = `A full-body fashion illustration of a young female mannequin on a clean cream paper texture background. Soft diffused studio lighting, gentle watercolor shading with crisp clean outlining, warm and elegant editorial style.`

const STYLE_INTRO_MALE = `A full-body fashion illustration of a young male mannequin on a clean cream paper texture background. Soft diffused studio lighting, gentle watercolor shading with crisp clean outlining, warm and modern editorial style.`

const MANNEQUIN_BY_ANGLE: Record<string, string> = {
  front: `The mannequin stands in a symmetrical front-facing A-pose, arms held slightly away from the body. She has an illustration-style face with big round amber eyes, delicate doll-like features, and a calm gentle expression. Her muted golden brown hair is pulled into a neat bun, with thin side-swept bangs across the forehead and soft wispy strands framing the face. Her skin is translucent fair with a creamy porcelain finish. Her build is slim.`,
  three_quarter: `The mannequin stands in a three-quarter front view, body turned approximately 45 degrees to the right in a relaxed A-pose. Her illustration-style face is visible in three-quarter profile, with big round amber eyes and delicate features. Her muted golden brown hair is in a neat bun with side-swept bangs and face-framing wisps. Her skin is translucent fair with a creamy porcelain finish. Her build is slim.`,
  back: `The mannequin stands in a full back view from behind, A-pose with arms slightly away from the body. Her muted golden brown hair is pulled into a neat bun. Her skin is translucent fair with a creamy porcelain finish visible on the neck, shoulders, and arms. Her build is slim. No face is visible.`,
}

const MANNEQUIN_MALE_BY_ANGLE: Record<string, string> = {
  front: `The mannequin stands in a symmetrical front-facing A-pose, arms held slightly away from the body at about 30 degrees. He has clean simple facial features with straight eyebrows, monolid eyes, thin lips, a calm neutral expression, and a sharp jawline. His hair is styled in a Hong Kong-style side part, smoothly swept to one side from a clean defined side part on the left, moderate volume and height on top with natural movement, neatly tapered sides gradually fading shorter, clean edges around the ears and neckline, jet black with a healthy subtle sheen. His skin is warm wheat-toned with a natural matte finish. He has broad straight shoulders, a square chest, a straight waist without taper, narrow firm hips, and subtle muscle definition on limbs without bulk.`,
  three_quarter: `The mannequin stands in a three-quarter front view, body turned approximately 45 degrees to the right in a relaxed A-pose. His face is visible in three-quarter profile, with clean features, straight eyebrows, monolid eyes, and a sharp jawline shown at an angle. His hair is styled in a Hong Kong-style side part, smoothly swept to one side from a clean defined side part, moderate volume on top, neatly tapered sides, jet black with a healthy subtle sheen. His skin is warm wheat-toned with a natural matte finish. He has broad straight shoulders, a square chest, a straight waist, narrow firm hips, and subtle muscle definition on limbs.`,
  back: `The mannequin stands in a full back view from behind, A-pose with arms slightly away from the body. His hair is styled in a Hong Kong-style side part, neatly tapered sides, jet black with a healthy subtle sheen. His warm wheat-toned skin is visible on the neck, shoulders, and arms. He has broad straight shoulders, a straight waist without taper, narrow firm hips, and subtle muscle definition on limbs. No face is visible.`,
}

function getMannequinView(angleIndex: number, gender: "female" | "male"): string {
  const map = gender === "female" ? MANNEQUIN_BY_ANGLE : MANNEQUIN_MALE_BY_ANGLE
  if (angleIndex === 0) return map.front
  if (angleIndex === 2) return map.back
  return map.three_quarter
}

function buildPrompt(items: AIOutfitItem[], angleIndex: number = 0, gender: "female" | "male" = "female"): string {
  const mainSlots = ["dress", "top", "bottom", "outerwear", "shoes", "bag"] as const

  const clothingLines: string[] = []
  const constraintLines: string[] = []
  for (const slot of mainSlots) {
    const item = items.find((i) => i.slot === slot)
    if (item) {
      clothingLines.push(`- ${SLOT_LABEL[slot]}: ${describeItem(item)}`)
      if (item.sub_category && NEGATIVE_FEATURES[item.sub_category]) {
        constraintLines.push(`  The ${SLOT_LABEL[slot].toLowerCase()} must NOT have: ${NEGATIVE_FEATURES[item.sub_category]}.`)
      }
    }
  }

  // 配饰单独描述
  const accessories = items.filter((i) => i.slot === "accessories")
  const accessoryLines: string[] = []
  for (const acc of accessories) {
    const color = describeColor(acc.color)
    accessoryLines.push(`- ${color} ${acc.name}`)
  }
  const hasAccessories = accessoryLines.length > 0

  const hasBottom = items.some((i) => i.slot === "bottom")
  const hasDress = items.some((i) => i.slot === "dress")
  const hasShoes = items.some((i) => i.slot === "shoes")

  const style = gender === "female" ? STYLE_INTRO : STYLE_INTRO_MALE
  const pronoun = gender === "female" ? "She" : "He"

  const lines = [
    style,
    "",
    getMannequinView(angleIndex, gender),
    "",
    `${pronoun} is dressed in:`,
    ...clothingLines,
    "",
    ...(hasAccessories
      ? [`${pronoun} is wearing these accessories:`, ...accessoryLines, ""]
      : []),
    ...(!hasDress && !hasBottom ? ["Lower body: bare. No pants, shorts, or skirt."] : []),
    ...(!hasShoes ? ["Feet: bare. No shoes."] : []),
    "",
    ...(constraintLines.length > 0 ? ["Strict per-item constraints:", ...constraintLines, ""] : []),
    "Keep the mannequin's pose, body proportions, facial features, skin tone, and hair exactly as described. Replace only the clothing.",
    ...(!hasAccessories ? ["No accessories, jewelry, patterns, bows, ribbons, or any design elements not listed above."] : []),
  ]

  return lines.join("\n")
}

export async function POST(request: NextRequest) {
  const userId = await requireAuth(request)
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  try {
    if (!SEEDREAM_KEY) {
      return NextResponse.json({ error: "Please set SEEDREAM_API_KEY in .env.local" }, { status: 500 })
    }

    const body = await request.json()
    const { items, angleIndex, gender } = body as { items: AIOutfitItem[]; angleIndex?: number; gender?: string }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Please provide AI outfit items" }, { status: 400 })
    }

    const angle = angleIndex ?? 0
    const safeGender = (gender === "male" ? "male" : "female") as "female" | "male"
    const prompt = buildPrompt(items, angle, safeGender)

    console.log("[generate-ai-outfit] Prompt:\n", prompt)

    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 180_000)
    let res: Response
    try {
      res = await fetch(`${SEEDREAM_BASE}/images/generations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SEEDREAM_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          prompt,
          n: 1,
          size: "1600x2400",
          response_format: "b64_json",
        }),
        signal: ctrl.signal,
        agent: httpsAgent,
      } as any)
    } finally {
      clearTimeout(t)
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.error("[generate-ai-outfit] API error:", res.status, errText.slice(0, 300))
      return NextResponse.json(
        { error: `Image generation failed: ${res.status}` },
        { status: 500 }
      )
    }

    const data = await res.json()
    const b64 = data.data?.[0]?.b64_json

    if (!b64) {
      console.error("[generate-ai-outfit] No b64_json:", JSON.stringify(data).slice(0, 300))
      return NextResponse.json({ error: "No image data returned" }, { status: 500 })
    }

    const outDir = path.join(process.cwd(), "public", "outputs")
    await mkdir(outDir, { recursive: true })
    const filename = `ai-outfit-${Date.now()}.png`
    await writeFile(path.join(outDir, filename), Buffer.from(b64, "base64"))

    return NextResponse.json({
      imageUrl: `/outputs/${filename}`,
      prompt,
      mode: "ai_seedream",
    })
  } catch (err) {
    console.error("[generate-ai-outfit]", err)
    return NextResponse.json(
      { error: "AI 生成失败，请稍后重试" },
      { status: 500 }
    )
  }
}
