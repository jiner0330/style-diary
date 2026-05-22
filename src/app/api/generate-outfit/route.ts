import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const OFOXAI_KEY = process.env.OFOXAI_API_KEY!
const OFOXAI_BASE = process.env.OFOXAI_BASE_URL || "https://api.ofox.ai"
const MODEL = "openai/gpt-image-2"

interface OutfitItem {
  slot: string
  name: string
  color: string
  category: string
  material?: string
  pattern?: string
  sub_category?: string
  detail?: string
  style_tags?: string[]
  image_url?: string
}

// Rich silhouette descriptions — each entry captures the key visual features
// so the model can render the garment accurately without relying on the detail field
const SUBCAT_SHAPE: Record<string, string> = {
  // ---- Tops ----
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

  // ---- Bottoms ----
  jeans: "straight-leg jeans, mid to high rise, classic five-pocket design, zip fly, straight cut from hip to ankle",
  trousers: "wide-leg tailored trousers, high-waisted, loose flowing wide legs from hip to hem, front pleats, side pockets",
  skirt: "A-line skirt, fitted at the natural waist, flaring gently to the hem, knee to midi length",
  shorts: "high-waisted shorts, relaxed fit through the leg, folded cuff hem, side pockets, zip fly",
  cargo: "cargo pants, relaxed straight-leg fit, multiple utility patch pockets on the thighs and sides, belt loops",
  chinos: "slim-fit chinos, tapered leg, mid-rise, slash front pockets, clean minimal design",
  wide_jeans: "high-waist wide-leg jeans, loose and relaxed from hip to ankle, oversized silhouette, five-pocket styling",

  // ---- Skirts (finer subtypes) ----
  mermaid_skirt: "fishtail mermaid skirt, fitted through the hips and thighs, flaring dramatically at the knee into a trumpet hem, maxi length",
  pencil_skirt: "pencil skirt, slim straight cut, fitted from waist to knee or below, back slit, office-ready silhouette",

  // ---- Dresses ----
  mini: "mini dress, short hemline above the knee, fitted or flared silhouette",
  midi: "midi dress, hemline falling between knee and ankle, feminine silhouette",
  maxi: "maxi dress, full-length hemline to the ankles, flowing or fitted silhouette",
  off_shoulder_dress: "off-shoulder dress, neckline sitting below the shoulders, fitted waist, flared or straight skirt, feminine silhouette",

  // ---- Outerwear ----
  blazer: "tailored blazer, structured shoulders, notched lapels, single-breasted button front, flap pockets, long sleeves",
  jacket: "cropped jacket hitting at the waist, boxy fit, front zipper or button closure, long sleeves",
  trench: "long trench coat, double-breasted button front, notched lapels, belted waist, epaulettes on shoulders, knee-length or longer",
  bomber: "cropped bomber jacket, ribbed stand collar, ribbed cuffs and hem, front zip, long sleeves",

  // ---- Shoes ----
  sneakers: "low-top flat lace-up sneakers, rounded toe, casual rubber sole",
  heels: "pointed-toe stiletto high heels, slim ankle strap, thin tall heel",
  boots: "lace-up combat boots, ankle to mid-calf height, chunky lug sole, round toe",
  loafers: "flat slip-on loafers, almond toe, low stacked heel, penny strap or plain upper",

  // ---- Bags ----
  tote: "large open-top tote bag, two shoulder straps, unstructured slouchy shape, spacious interior",
  shoulder: "small chain shoulder bag, flap front closure, compact rectangular shape, thin chain strap",
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
}

// Translate common Chinese fashion detail terms to English
const DETAIL_TRANSLATE: Record<string, string> = {
  // Necklines
  "方领": "square neckline", "V领": "V-neckline", "圆领": "round neckline",
  "高领": "high neckline", "一字肩": "off-shoulder", "露肩": "bare shoulder",
  "挂脖": "halter neck", "小圆领": "small round neckline", "大圆领": "wide round neckline",
  // Sleeves
  "泡泡袖": "puff sleeve", "灯笼袖": "lantern sleeve", "蝙蝠袖": "dolman sleeve",
  "短袖": "short-sleeve", "长袖": "long-sleeve", "无袖": "sleeveless",
  "袖口": "cuff", "肩带": "shoulder strap",
  // Waist & fit
  "收腰": "waist-cinching", "不收腰": "relaxed waist", "高腰": "high-waisted",
  "短款": "cropped", "露腰": "waist-baring", "宽松": "relaxed fit",
  "修身": "slim fit", "紧身": "tight fit", "较宽松慵懒版型": "slightly relaxed slouchy fit",
  "腰部微收": "slightly cinched waist", "收腰剪裁": "waist-cinching cut",
  "裁剪": "cut", "版型": "fit",
  // Closures & details
  "绑带": "tie closure", "系带": "drawstring tie", "交叉": "criss-cross",
  "拉链": "zipper", "隐形拉链": "invisible zipper", "门襟": "placket",
  "腰封": "waist belt", "口袋": "pocket", "多口袋": "multiple pockets",
  "裤耳": "belt loops",
  // Texture & shape
  "荷叶边": "ruffled trim", "蕾丝": "lace trim", "褶皱": "gathered ruched",
  "细褶": "fine pleating", "蓬松": "voluminous", "垂坠": "draped",
  "飘逸": "flowy", "轻盈": "lightweight", "廓形感": "structured shape",
  "廓形": "structured silhouette",
  // Hem & legs
  "裙摆": "hemline", "下摆": "hem", "散开": "flared",
  "微扩": "slightly flared", "阔腿": "wide-leg", "直筒": "straight-leg",
  "卷边": "folded cuff", "宽边": "wide", "裤脚": "leg opening",
  // Structure
  "鱼骨": "structured boning", "骨": "boning", "后背": "back",
  "内衬": "lining", "双肩": "shoulder",
  // Modifiers
  "蝴蝶结": "bow detail", "小飞袖": "small flutter sleeve", "飞袖": "flutter sleeve",
  "A字": "A-line", "拼接线": "panel seam line", "拼接": "panel seam",
  "三分之一": "one-third", "处": "point",
  "设计": "design", "自然": "natural", "较": "slightly",
  "较有": "slightly", "微收": "slightly gathered", "慵懒": "slouchy",
  "膝上": "above the knee", "至膝上": "to above the knee",
  "方领设计": "square neckline design",
  "不对称": "asymmetric", "斜肩": "one-shoulder", "油画": "oil painting style", "质感": "texture", "晕染": "watercolor wash",
  "翻领": "folded collar", "衬衫领": "shirt collar", "纽扣": "button",
  "落肩": "dropped shoulder", "罗纹": "ribbed", "无领": "collarless", "半开襟": "half placket", "粒扣": "button closure", "两粒扣": "two-button closure", "带盖": "flap", "胸前": "chest",
  "竖条纹": "vertical stripe", "小": "small", "前襟": "front placket", "敞开": "open",
}

function translateDetail(detail: string): string {
  if (!detail) return ""
  // Check if detail contains any Chinese characters
  if (!/[\u4e00-\u9fff]/.test(detail)) return detail

  // Normalize Chinese punctuation to English with spaces
  let result = detail
    .replace(/，/g, ", ")
    .replace(/、/g, ", ")
    .replace(/；/g, "; ")
    .replace(/。/g, ". ")
    .replace(/：/g, ": ")
    .replace(/）/g, ")")
    .replace(/（/g, "(")
    .replace(/\s+/g, " ")

  // Replace known Chinese terms with English equivalents (space-padded to avoid concatenation)
  const keys = Object.keys(DETAIL_TRANSLATE).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    result = result.split(key).join(` ${DETAIL_TRANSLATE[key]} `)
  }

  // Strip any remaining Chinese characters
  result = result.replace(/[\u4e00-\u9fff]+/g, "")
  // Clean up: collapse multiple spaces, fix punctuation spacing, trim
  result = result
    .replace(/[ ]{2,}/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*\.\s*/g, ". ")
    .replace(/^[,.\s]+|[,.\s]+$/g, "")
    .trim()

  return result || detail.replace(/[\u4e00-\u9fff]+/g, "").trim()
}

function describeItem(i: OutfitItem): string {
  const color = describeColor(i.color)
  const material = i.material || ""
  const pattern = i.pattern || ""
  const detail = translateDetail(i.detail || "")
  const shape = (i.sub_category && SUBCAT_SHAPE[i.sub_category]) || ""

  const attrs: string[] = []
  // Start with the silhouette as the core description
  if (shape) attrs.push(shape)
  // Color as adjective prefix
  attrs[0] = `${color} ${attrs[0]}`
  // Material
  if (material) attrs.push(MATERIAL_TEXTURE[material] || `${material} fabric`)
  // Extra design details
  if (detail) attrs.push(detail)
  // Pattern
  if (pattern) attrs.push(`${pattern} pattern`)

  return attrs.join(". ") + "."
}

const SLOT_LABEL: Record<string, string> = {
  dress: "Dress", top: "Top", bottom: "Bottom",
  outerwear: "Outerwear", shoes: "Shoes", bag: "Bag",
}

// Style anchor shared across all angles
const STYLE_HEADER = `A soft hand-drawn fashion illustration base figure, standing in a clear A-pose with arms held 30 degrees away from the body, gentle watercolor shading but with crisp clean outlining, cream paper texture background, pure white background behind the paper texture, cozy and healing vibe. Game asset.`

const FACE_DETAIL = `Illustration-style face with big round amber eyes, doll-like delicate features, calm gentle expression.`

const HAIR_DETAIL = `Muted golden brown hair with a matte finish, pulled into a neat bun. Thin, smooth side-swept bangs swept evenly across the forehead with no parting. Soft wispy face-framing strands of hair at both sides of the bangs.`

const SKIN_DETAIL = `Translucent fair skin with a creamy porcelain finish.`
const BODY_DETAIL = `Slim build.`

const MANNEQUIN_BY_ANGLE: Record<string, string> = {
  front: `The figure is a young female mannequin, isolated full-body front view, perfectly symmetrical, facing camera directly. ${FACE_DETAIL} ${HAIR_DETAIL} ${SKIN_DETAIL} ${BODY_DETAIL}`,
  three_quarter: `The figure is a young female mannequin, isolated full-body three-quarter front view, body turned approximately 45 degrees to the right. ${FACE_DETAIL} visible in three-quarter profile. ${HAIR_DETAIL} ${SKIN_DETAIL} ${BODY_DETAIL}`,
  back: `The figure is a young female mannequin, isolated full-body back view from behind. ${HAIR_DETAIL} ${SKIN_DETAIL} visible on the neck, shoulders, and arms. ${BODY_DETAIL} No face visible.`,
}

// Map angle index (0-2) to the corresponding view
// 0 = front (000), 1 = three-quarter (045), 2 = back (180)
function getMannequinView(angleIndex: number): string {
  if (angleIndex === 0) return MANNEQUIN_BY_ANGLE.front
  if (angleIndex === 2) return MANNEQUIN_BY_ANGLE.back
  return MANNEQUIN_BY_ANGLE.three_quarter
}

function buildPrompt(items: OutfitItem[], angleIndex: number = 0): string {
  const slots = ["dress", "top", "bottom", "outerwear", "shoes", "bag"] as const

  const clothingLines: string[] = []
  for (const slot of slots) {
    const item = items.find((i) => i.slot === slot)
    if (item) {
      clothingLines.push(`- ${SLOT_LABEL[slot]}: A ${describeItem(item)}`)
    }
  }

  const hasBottom = items.some((i) => i.slot === "bottom")
  const hasDress = items.some((i) => i.slot === "dress")
  const hasShoes = items.some((i) => i.slot === "shoes")

  const lines = [
    STYLE_HEADER,
    "",
    getMannequinView(angleIndex),
    "",
    "She is wearing:",
    ...clothingLines,
    "",
    ...(!hasDress && !hasBottom ? ["No pants, shorts, or skirt — lower body remains bare."] : []),
    ...(!hasShoes ? ["No shoes — feet remain bare."] : []),
    "",
    "Strictly no accessories, no patterns, no bows, no ribbons, no extra design elements not listed above.",
  ]

  return lines.join("\n")
}

// ─── Chinese prompt (display only, not used for generation) ───

const SUBCAT_SHAPE_ZH: Record<string, string> = {
  sweater: "针织毛衣，宽松版型，罗纹领口袖口下摆",
  shirt: "翻领衬衫，尖领结构，长袖带纽扣袖口",
  blouse: "收腰修身女士衬衫，柔和垂坠",
  cardigan: "开衫外披，无扣敞开式，自然垂落",
  hoodie: "连帽卫衣，抽绳帽，前袋鼠口袋，罗纹收口",
  sweatshirt: "圆领卫衣，落肩设计，宽松版型，罗纹下摆袖口，无帽",
  henley: "亨利领半开襟上衣，圆领，胸前短纽扣门襟",
  turtleneck: "高领修身打底衫，高翻领包裹颈部",
  off_shoulder_corset: "一字领露肩鱼骨上衣，领口低于肩线露出锁骨，胸前纵向鱼骨线分割交叉绑带，修身束腰短款，长袖",
  halter: "挂脖露背上衣，颈后系带，露肩露背，合身版型",
  off_shoulder_ls: "一字肩长袖修身，领口低于肩线露出锁骨，紧身长袖",
  puff_sleeve: "方领泡泡袖短上衣，蓬松灯笼短袖收拢于袖口，短款露腰，肩部细褶",
  off_shoulder_tee: "一字肩修身短款T恤，领口低于肩线",
  tank: "V领吊带背心，细肩带，宽松版型，轻盈面料",
  jeans: "直筒牛仔裤，中高腰，经典五袋设计",
  trousers: "宽松西裤，高腰，阔腿从臀到脚踝自然垂落，前褶裥",
  skirt: "A字半身裙，腰部贴合自然展开至下摆",
  shorts: "高腰短裤，宽松直筒，卷边裤脚，侧袋",
  cargo: "多口袋工装裤，宽松直筒版型，大腿侧贴袋",
  chinos: "修身斜纹裤，锥形裤腿",
  wide_jeans: "高腰阔腿牛仔裤，从臀到脚踝宽松阔腿",
  mermaid_skirt: "鱼尾包臀长裙，臀腿处紧身，膝部以下散开成鱼尾",
  pencil_skirt: "修身包臀裙，直筒紧身从腰到膝，后开衩",
  mini: "短款连衣裙，裙长在膝上",
  midi: "中长款连衣裙，裙长在膝与踝之间",
  maxi: "长款连衣裙，裙长至脚踝",
  off_shoulder_dress: "一字肩收腰连衣裙，领口低于肩线，收腰设计",
  blazer: "修身西装外套，挺括肩部，翻驳领，单排扣",
  jacket: "短款夹克，衣长及腰，箱型版型，前拉链或纽扣",
  trench: "长款风衣，双排扣，翻驳领，腰带收腰，及膝或更长",
  bomber: "短款棒球夹克，罗纹立领，罗纹袖口下摆，前拉链",
  sneakers: "平底运动鞋，低帮系带，圆头橡胶底",
  heels: "尖头细跟高跟鞋，细踝带，细高跟",
  boots: "系带马丁靴，及踝至中筒，厚底圆头",
  loafers: "平底乐福鞋，一脚蹬，杏仁鞋头，低叠跟",
  tote: "大号托特包，敞口，双肩带，软塌廓形",
  shoulder: "单肩链条小包，翻盖开合，紧凑长方形，细链条肩带",
}

function describeColorZh(hex: string): string {
  const map: Record<string, string> = {
    "#F5F5F5": "白色", "#FAF7F4": "米白色", "#E8E4DF": "米白色",
    "#3A3A3A": "黑色", "#2A2A2A": "黑色", "#5C5C5C": "深灰色",
    "#9A9A9A": "灰色", "#B5C1B4": "灰绿色", "#A8C4D4": "浅蓝色",
    "#D4C5C2": "裸粉色", "#D4C5A0": "米驼色", "#C5BFB8": "灰棕色",
    "#A3B5C4": "灰蓝色", "#B4C1A8": "军绿色", "#C4A8A3": "豆沙粉",
    "#D4A5A5": "粉棕色", "#E8DED1": "奶油色", "#6B8FA3": "蓝色",
    "#7B9CB5": "牛仔蓝", "#3A5A3A": "深绿色", "#5C3A2A": "深棕色",
    "#8B2252": "酒红色", "#E8B4B8": "粉色", "#E8D8A0": "鹅黄色",
    "#DDA040": "姜黄色", "#1A2A4A": "藏青色", "#F5F0D0": "浅黄色",
  }
  return map[hex] || hex
}

const MATERIAL_TEXTURE_ZH: Record<string, string> = {
  "欧根纱": "欧根纱，挺括哑光", "真丝": "真丝，细腻光泽垂坠",
  "丝绸": "丝绸，柔光垂坠", "雪纺": "雪纺，柔软飘逸",
  "棉": "纯棉，干净挺括", "纯棉": "纯棉，干净利落",
  "亚麻": "亚麻，天然肌理", "牛仔": "牛仔，斜纹面料",
  "针织": "针织，柔软弹性", "羊毛": "羊毛，绒面质感",
  "羊绒": "羊绒，细腻绒感", "皮革": "皮革",
  "蕾丝": "蕾丝", "纱": "薄纱，轻盈通透",
  "毛呢": "毛呢，挺括有型",
  "聚酯": "聚酯纤维，平滑挺括",
  "尼龙": "尼龙，轻盈光滑",
  "帆布": "帆布，厚实纹理",
}

function describeItemZh(i: OutfitItem): string {
  const color = describeColorZh(i.color)
  const material = i.material || ""
  const pattern = i.pattern || ""
  const detail = i.detail || ""
  const shape = (i.sub_category && SUBCAT_SHAPE_ZH[i.sub_category]) || ""

  const parts: string[] = [color]
  if (shape) parts.push(shape)
  if (material) parts.push(MATERIAL_TEXTURE_ZH[material] || material)
  if (detail) parts.push(detail)
  if (pattern) parts.push(`${pattern}图案`)

  return parts.join("，")
}

const SLOT_LABEL_ZH: Record<string, string> = {
  dress: "连衣裙", top: "上衣", bottom: "下装",
  outerwear: "外套", shoes: "鞋子", bag: "包包",
}

const STYLE_HEADER_ZH = `柔和手绘时尚插画，游戏素材风格，清晰利落轮廓线，奶油纸纹背景叠加纯白底色，温暖治愈感。`

const FACE_DETAIL_ZH = `插画风格面部，琥珀色大圆眼睛，洋娃娃般精致五官，温柔淡然的微笑表情。`

const HAIR_DETAIL_ZH = `哑光质感浅金棕色头发，整齐丸子头发髻，薄而柔滑的斜刘海均匀覆盖前额无分缝，刘海两侧柔软碎发自然修饰脸型。`

const SKIN_DETAIL_ZH = `白皙清透肤色，奶油般细腻陶瓷质感。`
const BODY_DETAIL_ZH = `纤细身材。`

const MANNEQUIN_BY_ANGLE_ZH: Record<string, string> = {
  front: `年轻女性人台模特，正面全身视图，完全对称，正面朝向镜头。标准A字站姿，手臂与身体保持30度间隙。${FACE_DETAIL_ZH} ${HAIR_DETAIL_ZH} ${SKIN_DETAIL_ZH} ${BODY_DETAIL_ZH}`,
  three_quarter: `年轻女性人台模特，四分之三前侧视图，身体向右转向约45度。${FACE_DETAIL_ZH} 可见四分之三侧脸轮廓。${HAIR_DETAIL_ZH} ${SKIN_DETAIL_ZH} ${BODY_DETAIL_ZH}`,
  back: `年轻女性人台模特，背面全身视图。${HAIR_DETAIL_ZH} ${SKIN_DETAIL_ZH} 可见于颈部、肩部和手臂。${BODY_DETAIL_ZH} 面部不可见。`,
}

function getMannequinViewZh(angleIndex: number): string {
  if (angleIndex === 0) return MANNEQUIN_BY_ANGLE_ZH.front
  if (angleIndex === 2) return MANNEQUIN_BY_ANGLE_ZH.back
  return MANNEQUIN_BY_ANGLE_ZH.three_quarter
}

function buildPromptZh(items: OutfitItem[], angleIndex: number = 0): string {
  const slots = ["dress", "top", "bottom", "outerwear", "shoes", "bag"] as const

  const clothingLines: string[] = []
  for (const slot of slots) {
    const item = items.find((i) => i.slot === slot)
    if (item) {
      clothingLines.push(`${SLOT_LABEL_ZH[slot]}：${describeItemZh(item)}。`)
    }
  }

  const hasBottom = items.some((i) => i.slot === "bottom")
  const hasDress = items.some((i) => i.slot === "dress")
  const hasShoes = items.some((i) => i.slot === "shoes")

  const lines = [
    STYLE_HEADER_ZH,
    "",
    getMannequinViewZh(angleIndex),
    "",
    "穿着搭配：",
    ...clothingLines,
    "",
    ...(!hasDress && !hasBottom ? ["下身保持裸露，不添加任何裤子或裙子。"] : []),
    ...(!hasShoes ? ["双脚保持赤脚状态，不添加任何鞋子。"] : []),
    "",
    "严格约束：不添加任何配饰、图案、蝴蝶结、丝带、褶皱花边，不添加描述中未提及的装饰元素。",
  ]

  return lines.join("\n")
}

export async function POST(request: Request) {
  try {
    if (!OFOXAI_KEY) {
      return NextResponse.json(
        { error: "Please set OFOXAI_API_KEY in .env.local" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { items } = body as { gender?: string; items: OutfitItem[]; angleIndex?: number }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Please select at least one item" }, { status: 400 })
    }

    const angleIndex = body.angleIndex ?? 0
    const prompt = buildPrompt(items, angleIndex)
    const promptZh = buildPromptZh(items, angleIndex)

    // 用单品 ID + 角度生成固定 seed，同一套搭配同一角度永远出同一张图
    const itemIds = items.map((i) => i.name).sort().join("|")
    const seed = Array.from(itemIds + angleIndex).reduce((s, c) => ((s << 5) - s + c.charCodeAt(0)) | 0, 0)

    console.log("[generate-outfit] Prompt:\n", prompt)

    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 180_000)
    let res: Response
    try {
      res = await fetch(`${OFOXAI_BASE}/v1/images/generations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OFOXAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          prompt,
          n: 1,
          size: "1024x1536",
          response_format: "b64_json",
          seed,
        }),
        signal: ctrl.signal,
      })
    } finally {
      clearTimeout(t)
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.error("[generate-outfit] API error:", res.status, errText.slice(0, 300))
      return NextResponse.json(
        { error: `Image generation failed: ${res.status}` },
        { status: 500 }
      )
    }

    const data = await res.json()
    const b64 = data.data?.[0]?.b64_json

    if (!b64) {
      console.error("[generate-outfit] No b64_json:", JSON.stringify(data).slice(0, 300))
      return NextResponse.json({ error: "No image data returned" }, { status: 500 })
    }

    const outDir = path.join(process.cwd(), "public", "outputs")
    await mkdir(outDir, { recursive: true })
    const filename = `outfit-${Date.now()}.png`
    await writeFile(path.join(outDir, filename), Buffer.from(b64, "base64"))

    return NextResponse.json({
      imageUrl: `/outputs/${filename}`,
      prompt,
      promptZh,
      mode: "text_only",
    })
  } catch (err) {
    console.error("[generate-outfit]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
