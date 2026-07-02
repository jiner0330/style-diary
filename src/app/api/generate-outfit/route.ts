import { NextRequest, NextResponse } from "next/server"
import https from "https"
import { createClient } from "@supabase/supabase-js"
import sharp from "sharp"

// Hobby 计划函数最长 60s；同步生图须在此预算内完成
export const maxDuration = 60

const OFOXAI_KEY = process.env.OFOXAI_API_KEY!
const OFOXAI_BASE = process.env.OFOXAI_BASE_URL || "https://api.ofox.ai"
const MODEL = "openai/gpt-image-2"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const RENDER_BUCKET = "outfit-renders"
// prompt 逻辑一改就 +1，使旧缓存失效、自动重新生成
const PROMPT_VERSION = "v15"

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
  t_shirt: "short-sleeve crewneck t-shirt, round neckline, straight relaxed fit, clean casual silhouette",
  polo: "polo shirt with a flat knit collar and short button placket at the chest, short sleeves with ribbed cuffs, straight hem with side slits, smart-casual silhouette",
  cami: "thin spaghetti strap camisole top, low scoop or V neckline, slim fitted silhouette, lightweight fabric",

  // ---- Bottoms ----
  jeans: "straight-leg jeans, mid to high rise, classic five-pocket design, zip fly, straight cut from hip to ankle",
  trousers: "wide-leg tailored trousers, high-waisted, loose flowing wide legs from hip to hem, front pleats, side pockets",
  skirt: "A-line skirt, fitted at the natural waist, flaring gently to the hem, knee to midi length",
  shorts: "high-waisted shorts, relaxed fit through the leg, folded cuff hem, side pockets, zip fly",
  cargo: "cargo pants, relaxed straight-leg fit, multiple utility patch pockets on the thighs and sides, belt loops",
  chinos: "slim-fit chinos, tapered leg, mid-rise, slash front pockets, clean minimal design",
  wide_jeans: "high-waist wide-leg jeans, loose and relaxed from hip to ankle, oversized silhouette, five-pocket styling",

  // ---- Skirts (finer subtypes) ----
  mermaid_skirt: "fishtail mermaid skirt, fitted through the hips and thighs, flaring dramatically at the knee into a trumpet hem",
  pencil_skirt: "pencil skirt, slim straight cut, fitted from waist to knee or below, back slit, office-ready silhouette",
  tiered_tulle_skirt: "layered tiered tulle skirt, multiple stacked horizontal ruffled layers, soft gathered texture",
  a_line_skirt: "A-line skirt, fitted at the natural waist, flaring gently outward to the hem",
  pleated_skirt: "pleated skirt, evenly pressed fine pleats from waistband falling straight, structured folds",

  // ---- Dresses ----
  slip_dress: "slim slip dress, thin spaghetti straps, straight silhouette with a slight drape through the body, no waist seam, midi length, lightweight silky fabric",
  bodycon_dress: "body-hugging bodycon dress, tightly fitted through the bust waist and hips, stretch fabric that clings to every curve",
  a_line_dress: "A-line dress, fitted bodice flaring gradually from the waist to the hem in a clean A-shape, feminine silhouette",
  shirt_dress: "button-front shirt dress with a pointed collar, long sleeves with buttoned cuffs, self-tie belt at the waist, relaxed straight fit through the body",
  wrap_dress: "wrap dress with a V-neckline, overlapping front panels crossing at the waist and tying at the side seam, flared skirt, feminine silhouette",
  mini: "mini dress, short hemline above the knee, fitted or flared silhouette",
  midi: "midi dress, hemline falling between knee and ankle, feminine silhouette",
  maxi: "maxi dress, full-length hemline to the ankles, flowing or fitted silhouette",
  off_shoulder_dress: "off-shoulder dress, neckline sitting below the shoulders, fitted waist, flared or straight skirt, feminine silhouette",
  qipao: "Chinese qipao cheongsam dress, small mandarin stand-up collar, diagonal front placket with knotted frog button closures, slim fitted silhouette, side slit at the lower hem, elegant traditional tailoring",

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
    "#8B2252": "burgundy red", "#E8B4B8": "pink", "#E8C4C9": "misty pink", "#C1D8C3": "fresh green", "#F5E68C": "lemon yellow", "#E8D8A0": "butter yellow",
    "#DDA040": "mustard yellow", "#1A2A4A": "navy", "#F5F0D0": "pale yellow",
    "#E8C8B0": "nude", "#C4886A": "warm terracotta", "#F5F0E8": "cream white",
    "#8A8A8A": "gray", "#4A6B8A": "indigo blue", "#8A7A5A": "olive khaki",
    "#D4C8B8": "warm beige", "#D4D4D4": "silver", "#D4B060": "gold", "#D4A8A0": "rose gold",
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
  "天丝": "Tencel lyocell fabric, smooth with subtle sheen and fluid drape",
}

const FIT_MAP: Record<string, string> = {
  "紧身": "tightly fitted, body-hugging",
  "修身": "slim fit, tailored",
  "合身": "regular fit",
  "宽松": "relaxed fit, loose",
  "oversized": "oversized fit, deliberately large",
}

const NECKLINE_MAP: Record<string, string> = {
  "吊带": "thin spaghetti straps, sleeveless",
  "圆领": "round crew neckline",
  "V领": "V-neckline",
  "方领": "square neckline",
  "高领": "turtleneck, high folded collar covering the neck",
  "翻领": "folded lapel collar",
  "一字肩": "off-shoulder neckline, bare shoulders",
  "一字领": "off-shoulder neckline, bare shoulders",
  "无领": "collarless",
  "挂脖": "halter neck, strap wraps behind the neck",
  "小圆领": "small round neckline",
  "立领": "mandarin stand collar",
  "蝴蝶结飘带": "ribbon bow tie at neckline",
}

const PATTERN_TRANSLATE: Record<string, string> = {
  "格纹": "checked plaid", "条纹": "striped", "碎花": "floral",
  "纯色": "solid color", "波点": "polka dot", "豹纹": "leopard print",
  "千鸟格": "houndstooth", "拼接": "color-block", "扎染": "tie-dye",
  "迷彩": "camo", "佩斯利": "paisley", "菱格": "argyle",
  "格子": "gingham check", "苏格兰格": "tartan plaid",
}

// Translate common Chinese fashion detail terms to English
const DETAIL_TRANSLATE: Record<string, string> = {
  // Necklines
  "方领": "square neckline", "V领": "V-neckline", "圆领": "round neckline",
  "高领": "high neckline", "一字肩": "off-shoulder", "一字领": "off-shoulder neckline",
  "露肩": "bare shoulder",
  "挂脖": "halter neck", "小圆领": "small round neckline", "大圆领": "wide round neckline",
  "娃娃领": "peter pan collar",
  // Sleeves
  "泡泡袖": "puff sleeve", "灯笼袖": "lantern sleeve", "蝙蝠袖": "dolman sleeve",
  "短袖": "short-sleeve", "长袖": "long-sleeve", "无袖": "sleeveless",
  "有袖": "with sleeve", "袖口": "cuff", "明线收口": "topstitched hem",
  "收拢": "gathered into", "肩带": "shoulder strap",
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
  "裤耳": "belt loops", "后背拉链": "back zipper closure",
  "平驳领": "notch lapel", "单排": "single-breasted", "装饰扣": "decorative button",
  "翻盖": "flap", "后中开衩": "center back vent", "挺括": "crisp and structured",
  "三粒": "three", "开合": "closure", "调节袢扣": "adjustable tab closure",
  "丹宁": "denim", "磨白": "faded", "水洗": "washed",
  "双排扣": "double-breasted", "肩章": "epaulette", "可拆卸": "detachable",
  "同色系": "matching", "防泼水": "water-repellent", "大腿中部": "mid-thigh",
  "拼色": "color-block", "按扣": "snap button", "撞色": "contrast color",
  "袖身": "sleeve", "衣身": "body", "刺绣": "embroidered",
  "字母": "letter", "徽章": "patch", "胸口": "chest",
  "马衔扣": "horsebit hardware", "浅口": "low vamp", "鞋口": "shoe opening",
  "包边": "bound edge", "平底": "flat sole", "鞋面": "shoe upper",
  "皮面": "leather surface", "圆头": "round toe",
  "系带设计": "lace-up design", "橡胶": "rubber", "鞋底": "sole",
  "鞋头": "toe cap", "尖头": "pointed toe", "细跟": "stiletto heel",
  "厘米": "cm", "高约": "approximately", "边缘": "edge",
  "细腻": "fine", "纤薄": "slim", "脚背": "instep",
  "一字带": "single strap", "搭扣": "buckle closure", "粗跟": "block heel",
  "漆皮": "patent leather", "八孔系带": "eight-eyelet lace-up closure", "八孔": "eight-eyelet", "鞋帮": "shaft",
  "脚踝以上": "above the ankle", "厚底": "chunky platform sole",
  "防滑": "anti-slip", "齿纹": "tread pattern", "缝线": "stitching",
  "麂皮": "suede", "生胶": "gum rubber", "鞋舌": "shoe tongue",
  "品牌": "brand", "标贴": "logo patch", "银色": "silver",
  "金属银色": "metallic silver", "敞口": "open-top",
  "包身": "bag body", "方正": "structured rectangular",
  "宽大": "spacious", "提手": "top carry handle",
  "素面": "plain surface", "粒纹": "pebbled grain texture",
  "牛皮": "cowhide leather", "边骨": "edge piping",
  "链条": "chain", "盘绕": "draped",
  "小巧": "compact", "羊皮": "lambskin",
  "双C扣": "double C-logo clasp", "简洁": "clean minimal",
  "竖长": "vertically elongated tall shape", "短提手": "short carry handle",
  "厚实": "sturdy thick", "中央": "center",
  "锁骨链": "collarbone chain", "链身": "chain body",
  "单颗": "single", "小圆形": "small round",
  "吊坠": "pendant", "抛光": "polished",
  "圆润": "round smooth", "镶嵌": "set in", "耳针": "ear post",
  "表面": "surface", "柔和": "soft", "反光": "reflective sheen",
  "珍珠表面": "pearl surface", "金色": "gold", "猫眼型": "cat-eye shape",
  "镜框": "frame", "深色": "dark tinted", "镜片": "lens",
  "镜腿": "temple arms", "向外展开": "flaring outward",
  "上缘": "upper rim", "猫眼": "cat-eye",
  "细窄": "slim narrow", "带身": "belt strap",
  "方扣": "square buckle", "小方扣": "small square buckle",
  "尾端": "tail end", "收窄": "tapered",
  "玫瑰金": "rose gold", "圆形": "round",
  "表盘": "watch dial", "刻度": "hour markers",
  "指针": "watch hands", "表带": "watch band",
  "表冠": "crown", "右侧": "right side",
  "方形": "square shape", "手工卷边": "hand-rolled edge",
  "卷边": "rolled edge", "碎花": "small floral print",
  "排列": "arranged", "丝绸": "silk fabric",
  "图案": "pattern", "材质": "fabric material",
  // Pattern names — keep these in DETAIL_TRANSLATE so they don't get stripped
  "格纹": "checked plaid", "格子": "gingham check", "条纹": "stripe",
  "豹纹": "leopard print", "千鸟格": "houndstooth", "扎染": "tie-dye",
  "迷彩": "camo", "佩斯利": "paisley", "菱格": "argyle",
  "苏格兰格": "tartan plaid",
  "光泽感": "luminous sheen",
  // Texture & shape
  "荷叶边": "ruffled trim", "蕾丝": "lace trim", "褶皱": "gathered ruched",
  "细褶": "fine pleating", "蓬松": "voluminous", "垂坠": "draped",
  "飘逸": "flowy", "轻盈": "lightweight", "廓形感": "structured shape",
  "廓形": "structured silhouette",
  "虚压褶": "soft pressed pleats", "压褶": "pressed pleats", "竖向": "vertical",
  // Hem & legs
  "不规则": "irregular", "裙摆": "hemline", "裙身": "skirt body", "下摆": "hem", "散开": "flared",
  "微扩": "slightly flared", "阔腿": "wide-leg", "直筒": "straight-leg",
  "宽边": "wide", "裤脚": "leg opening",
  // Structure
  "鱼骨": "structured boning", "骨": "boning", "后背": "back",
  "内衬": "lining", "双肩": "shoulder", "明线": "visible topstitching",
  "纵向": "vertical", "分割": "segmented", "腹部": "abdomen",
  "一侧": "one side", "两个": "two",
  // Modifiers
  "蝴蝶结飘带": "ribbon bow tie", "蝴蝶结": "bow detail", "喇叭袖": "bell sleeve", "细吊带": "thin spaghetti strap", "吊带": "spaghetti strap", "小玫瑰": "small rose", "玫瑰": "rose", "花卉": "floral", "亮面": "glossy finish", "飘带": "ribbon tie", "透感": "sheer translucency", "小飞袖": "small flutter sleeve", "飞袖": "flutter sleeve",
  "蝴蝶结系带": "bow tie ribbon", "大摆": "wide flared", "端庄": "elegant and poised", "A字": "A-line", "拼接线": "panel seam line", "拼接": "panel seam",
  "三分之一": "one-third", "处": "point",
  "设计": "design", "自然": "natural", "较": "slightly", "哑光": "matte", "素色": "solid color", "领口": "neckline", "装饰": "decoration", "优雅": "elegant", "整体": "overall",
  "较有": "slightly", "微收": "slightly gathered", "慵懒": "slouchy",
  "带": "with", "呈": "appears as", "状": "form",
  "膝上": "above the knee", "至膝上": "to above the knee", "脚踝": "the ankle", "缎面": "satin finish", "光泽": "luminous sheen",
  "小立领": "small mandarin stand collar", "立领": "mandarin stand collar", "斜襟": "diagonal front placket", "盘扣": "knotted frog button", "省道": "tailored dart", "开衩": "side slit", "旗袍": "qipao cheongsam silhouette", "印花": "print design", "素雅": "subtle and refined", "暗纹": "subtle tonal pattern", "方领设计": "square neckline design",
  "不对称": "asymmetric", "斜肩": "one-shoulder", "露背": "backless", "波点": "polka dot", "开口": "opening", "两侧": "both sides", "垂落": "draping down", "均匀": "evenly", "分布": "distributed", "细微": "subtle", "纹理": "texture", "腰间": "waist", "侧边": "side", "肩部": "the shoulders", "横跨": "across", "背部": "back", "正面": "front", "大面积": "wide area", "深度": "depth", "适中": "moderate", "油画": "oil painting style", "质感": "texture", "晕染": "watercolor wash",
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

// 长度语义按品类分：上衣/外套量的是上身落点，裙装/下装量的是腿部落点
const LENGTH_MAP: Record<string, Record<string, string>> = {
  top: {
    "短款": "cropped, waist-length hem",
    "常规": "regular hip-length hem",
    "中长": "longline top reaching the hip",
    "长款": "long tunic length reaching the upper thigh",
  },
  outerwear: {
    "短款": "cropped, waist-length",
    "常规": "hip-length",
    "中长": "knee-length",
    "长款": "long coat falling below the knee",
  },
  // dress / bottom / 其它：沿腿部度量
  default: {
    "短款": "mini length, above the knee",
    "常规": "regular length",
    "中长": "midi length, between knee and calf",
    "长款": "maxi length, ankle-length or floor-length",
  },
}

// sub_category 未收录时的兜底基底名词（避免输出 "color undefined"）
const SLOT_NOUN: Record<string, string> = {
  top: "top", bottom: "bottoms", dress: "dress",
  outerwear: "jacket", shoes: "shoes", bag: "bag",
}

// 如果值是中文就用字典翻译，已经是英文就直接用
function en(value: string | null | undefined, dict: Record<string, string>): string {
  if (!value) return ""
  if (!/[\u4e00-\u9fff]/.test(value)) return value
  return dict[value] || ""
}

function describeItem(i: OutfitItem): string {
  const color = describeColor(i.color)
  const shape = (i.sub_category && SUBCAT_SHAPE[i.sub_category]) || ""
  const simpleBase = SLOT_NOUN[i.slot] || "garment"

  const material = en(i.material, MATERIAL_TEXTURE)
  const pattern = en(i.pattern, PATTERN_TRANSLATE)
  console.log(`[describeItem] slot=${i.slot} name=${i.name} sub_category="${i.sub_category}" rawPattern="${i.pattern}" translated="${pattern}"`)

  // Strip structured-field content from detail before translation to avoid
  // duplicate/garbled output (e.g. detail="纯棉面料，微修身版型" when material & fit are already set)
  let cleanDetail = i.detail || ""
  if (cleanDetail && /[\u4e00-\u9fff]/.test(cleanDetail)) {
    // Remove terms already covered by structured fields
    if (i.pattern) cleanDetail = cleanDetail.replace(/[，,、]?\s*(简约)?无?图案/g, "")
    if (i.fit) cleanDetail = cleanDetail.replace(/[，,、]?\s*微?(修身|紧身|宽松|合身|慵懒)版型/g, "")
    if (i.material) cleanDetail = cleanDetail.replace(/[，,、]?\s*(纯棉|棉|真丝|丝绸|雪纺|亚麻|牛仔|针织|羊毛|皮革|蕾丝|毛呢|聚酯|尼龙|帆布|氨纶|薄纱|混纺|缎面|醋酸|麂皮|天丝|棉\+氨纶)面料/g, "")
    if (i.neckline) cleanDetail = cleanDetail.replace(/[，,、]?\s*(圆领|V领|方领|高领|一字肩|一字领|挂脖|小圆领|立领|翻领|无领|吊带)/g, "")
    cleanDetail = cleanDetail.replace(/^[，,、\s]+|[，,、\s]+$/g, "").trim()
  }
  const detail = translateDetail(cleanDetail)

  // Slot-aware: only apply fit/neckline/length to clothing slots
  const isClothing = (s: string) => ["top", "bottom", "dress", "outerwear"].includes(s)
  const hasNeckline = (s: string) => ["top", "dress"].includes(s)
  // When SUBCAT_SHAPE provides a detailed description, it already covers fit & neckline —
  // appending them again creates contradictions (e.g. shape "V-neck, relaxed fit" + field "round crew neckline, slim fit")
  const fitHint = (isClothing(i.slot) && !shape) ? en(i.fit, FIT_MAP) : ""
  const necklineHint = (hasNeckline(i.slot) && !shape) ? en(i.neckline, NECKLINE_MAP) : ""
  const lengthHint = isClothing(i.slot)
    ? en(i.length, LENGTH_MAP[i.slot] || LENGTH_MAP.default)
    : ""

  const attrs: string[] = []
  // 图案紧贴单品名：避免模型把图案当成独立概念忽略
  if (pattern) {
    attrs.push(`${color} ${simpleBase} with a ${pattern} pattern`)
    if (shape) attrs.push(shape)
  } else {
    attrs.push(`${color} ${shape || simpleBase}`)
  }
  if (material) attrs.push(material)
  if (fitHint) attrs.push(fitHint)
  if (necklineHint) attrs.push(necklineHint)
  if (lengthHint) attrs.push(lengthHint)
  // Only include detail if it adds meaningful content (skip garbled word-for-word translation leftovers)
  if (detail && detail.length > 15) attrs.push(detail)

  return attrs.join(". ") + "."
}

const SLOT_LABEL: Record<string, string> = {
  dress: "Dress", top: "Top", bottom: "Bottom",
  outerwear: "Outerwear", shoes: "Shoes", bag: "Bag",
}

// Style anchor shared across all angles
const STYLE_HEADER = `A soft hand-drawn fashion illustration base figure, gentle watercolor shading but with crisp clean outlining, cream paper texture background, pure white background behind the paper texture, cozy and healing vibe. Game asset.`

const FACE_DETAIL = `Illustration-style face with big round amber eyes, doll-like delicate features, calm gentle expression.`

const HAIR_DETAIL = `Muted golden brown hair with a matte finish, pulled into a neat bun. Thin, smooth side-swept bangs swept evenly across the forehead with no parting. Soft wispy face-framing strands of hair at both sides of the bangs.`

const SKIN_DETAIL = `Translucent fair skin with a creamy porcelain finish.`
const BODY_DETAIL = `Slim build.`

// ─── Male mannequin description ───
const MALE_FACE_DETAIL = `Clean simple facial features with straight eyebrows, monolid eyes, thin lips, calm neutral expression, sharp jawline.`
const MALE_HAIR_DETAIL = `Hong Kong-style side-parted hairstyle, hair smoothly swept to one side from a clean defined side part on the left, moderate volume and height on top with natural movement, neatly tapered sides gradually fading shorter, clean edges around the ears and neckline, jet black with a healthy subtle sheen, polished yet effortless look.`
const MALE_SKIN_DETAIL = `Warm wheat-toned skin with a natural matte finish.`
const MALE_BODY_DETAIL = `Broad straight shoulders, square chest, straight waist without taper, narrow firm hips, subtle muscle definition on limbs without bulk.`

const MANNEQUIN_BY_ANGLE: Record<string, string> = {
  front: `The figure is a young female mannequin, isolated full-body front view, standing in a symmetrical A-pose with arms held slightly away from the body, perfectly symmetrical, facing camera directly. ${FACE_DETAIL} ${HAIR_DETAIL} ${SKIN_DETAIL} ${BODY_DETAIL}`,
  three_quarter: `The figure is a young female mannequin, isolated full-body three-quarter front view, standing with body and head turned approximately 45 degrees away from the camera to the right, NOT facing forward, arms resting naturally at her sides. Her face is seen in three-quarter profile — one amber eye fully visible, the other partially hidden by the nose bridge, delicate doll-like features shown at an angle. ${HAIR_DETAIL} ${SKIN_DETAIL} ${BODY_DETAIL}`,
  back: `The figure is a young female mannequin, isolated full-body back view from behind, standing with arms resting naturally at her sides, facing away from the camera. ${HAIR_DETAIL} ${SKIN_DETAIL} visible on the neck, shoulders, and arms. ${BODY_DETAIL} No face visible.`,
}

const MANNEQUIN_MALE_BY_ANGLE: Record<string, string> = {
  front: `The figure is a young male mannequin, isolated full-body front view, standing in a symmetrical A-pose with arms held slightly away from the body at about 30 degrees, perfectly symmetrical, facing camera directly. ${MALE_FACE_DETAIL} ${MALE_HAIR_DETAIL} ${MALE_SKIN_DETAIL} ${MALE_BODY_DETAIL}`,
  three_quarter: `The figure is a young male mannequin, isolated full-body three-quarter front view, standing with body and head turned approximately 45 degrees away from the camera to the right, NOT facing forward, arms resting naturally at his sides. His face is seen in three-quarter profile — clean features with straight eyebrows, monolid eyes, sharp jawline shown at an angle. ${MALE_HAIR_DETAIL} ${MALE_SKIN_DETAIL} ${MALE_BODY_DETAIL}`,
  back: `The figure is a young male mannequin, isolated full-body back view from behind, standing with arms resting naturally at his sides, facing away from the camera. ${MALE_HAIR_DETAIL} ${MALE_SKIN_DETAIL} visible on the neck, shoulders, and arms. ${MALE_BODY_DETAIL} No face visible.`,
}

// Map angle index to the corresponding view
// 0 = front (000), 2 = back (180). 1 (three-quarter 045) is no longer used.
function getMannequinView(angleIndex: number, gender: "female" | "male"): string {
  const map = gender === "female" ? MANNEQUIN_BY_ANGLE : MANNEQUIN_MALE_BY_ANGLE
  if (angleIndex === 0) return map.front
  if (angleIndex === 2) return map.back
  return map.three_quarter
}

function buildPrompt(items: OutfitItem[], angleIndex: number = 0, gender: "female" | "male" = "female"): string {
  const mainSlots = ["dress", "top", "bottom", "outerwear", "shoes", "bag"] as const

  const clothingLines: string[] = []
  for (const slot of mainSlots) {
    const item = items.find((i) => i.slot === slot)
    if (item) {
      clothingLines.push(`- ${SLOT_LABEL[slot]}: A ${describeItem(item)}`)
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

  const pronoun = gender === "female" ? "She" : "He"

  const lines = [
    STYLE_HEADER,
    "",
    getMannequinView(angleIndex, gender),
    "",
    `${pronoun} is wearing:`,
    ...clothingLines,
    "",
    ...(hasAccessories
      ? [`${pronoun} is wearing these accessories:`, ...accessoryLines, ""]
      : []),
    ...(!hasDress && !hasBottom ? ["No pants, shorts, or skirt — lower body remains bare."] : []),
    ...(!hasShoes ? ["No shoes — feet remain bare."] : []),
    "",
    ...(!hasAccessories ? ["Strictly no additional accessories — no jewelry, sunglasses, scarves, watches, or extra decorative elements beyond what is described in the outfit above."] : []),
    ...(angleIndex === 2 ? ["This is a BACK view — visible from behind only. The neckline, collar, front buttons, front pockets, front bows, ribbons, and any front-facing decoration must NOT be visible. Only show back silhouette, back details (back zipper, back vent, back yoke), hem, sleeves from behind, and hair."] : []),
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
  t_shirt: "圆领短袖T恤，直身版型，干净利落的休闲廓形",
  polo: "翻领POLO衫，短纽扣门襟，短袖罗纹袖口，下摆侧开衩，商务休闲廓形",
  cami: "细肩带吊带背心，低V领紧身版型，轻薄贴身面料",
  jeans: "直筒牛仔裤，中高腰，经典五袋设计",
  trousers: "宽松西裤，高腰，阔腿从臀到脚踝自然垂落，前褶裥",
  skirt: "A字半身裙，腰部贴合自然展开至下摆",
  shorts: "高腰短裤，宽松直筒，卷边裤脚，侧袋",
  cargo: "多口袋工装裤，宽松直筒版型，大腿侧贴袋",
  chinos: "修身斜纹裤，锥形裤腿",
  wide_jeans: "高腰阔腿牛仔裤，从臀到脚踝宽松阔腿",
  mermaid_skirt: "鱼尾包臀长裙，臀腿处紧身，膝部以下散开成鱼尾",
  pencil_skirt: "修身包臀裙，直筒紧身从腰到膝，后开衩",
  slip_dress: "吊带连衣裙，细肩带，直身微弧版型自然垂坠，无腰线分割，轻盈面料",
  bodycon_dress: "紧身连衣裙，全身紧贴曲线，弹力面料包裹身形，细肩带或短袖，膝上或及膝长度",
  a_line_dress: "A字连衣裙，上身合体从腰向下逐渐展开，经典A字廓形，优雅大方",
  shirt_dress: "翻领衬衫裙，前襟纽扣开合，腰部自系带收腰，长袖或短袖带袖口，直身版型",
  wrap_dress: "裹身连衣裙，V领交叉前片，腰间系带自然收腰，下摆裙摆散开",
  mini: "短款连衣裙，裙长在膝上",
  midi: "中长款连衣裙，裙长在膝与踝之间",
  maxi: "长款连衣裙，裙长至脚踝",
  off_shoulder_dress: "一字肩收腰连衣裙，领口低于肩线，收腰设计",
  qipao: "中式旗袍，小立领，斜襟盘扣，修身版型，侧边开衩，端庄传统",
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
    "#8B2252": "酒红色", "#E8B4B8": "粉色", "#E8C4C9": "雾粉色", "#C1D8C3": "清新绿", "#F5E68C": "檬黄色", "#E8D8A0": "鹅黄色",
    "#DDA040": "姜黄色", "#1A2A4A": "藏青色", "#F5F0D0": "浅黄色", "#D4D4D4": "银色", "#D4B060": "金色", "#D4A8A0": "玫瑰金",
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

const MANNEQUIN_MALE_BY_ANGLE_ZH: Record<string, string> = {
  front: `年轻男性人台模特，正面全身视图，完全对称，正面朝向镜头。标准A字站姿，手臂与身体保持30度间隙。五官简洁清爽，眉毛平直，单眼皮，薄唇，下颌线清晰，中性沉稳表情。港式侧背发型，清晰偏分线将头发向一侧梳理，顶部蓬松有自然纹理和高度，两侧渐变推短利落干净，耳后和颈部边缘整洁，乌黑色健康微光。肩膀宽阔平直，胸廓方正，腰线直筒不内收，臀部窄而紧实，四肢有轻微肌肉线条但不夸张。暖调小麦色皮肤，自然哑光质感。`,
  three_quarter: `年轻男性人台模特，四分之三前侧视图，身体向右转向约45度。可见四分之三侧脸轮廓，下颌线清晰。港式侧背发型，清晰偏分线将头发向一侧梳理，顶部蓬松有自然纹理和高度，两侧渐变推短利落干净，乌黑色健康微光。暖调小麦色皮肤。肩膀宽阔平直，胸廓方正，腰线直筒，臀部窄而紧实，四肢有轻微肌肉线条。`,
  back: `年轻男性人台模特，背面全身视图。港式侧背发型，乌黑色健康微光，两侧渐变推短利落干净。暖调小麦色皮肤可见于颈部、肩部和手臂。肩膀宽阔平直，腰线直筒不内收，臀部窄而紧实，四肢有轻微肌肉线条。面部不可见。`,
}

function getMannequinViewZh(angleIndex: number, gender: "female" | "male"): string {
  const map = gender === "female" ? MANNEQUIN_BY_ANGLE_ZH : MANNEQUIN_MALE_BY_ANGLE_ZH
  if (angleIndex === 0) return map.front
  if (angleIndex === 2) return map.back
  return map.three_quarter
}

function buildPromptZh(items: OutfitItem[], angleIndex: number = 0, gender: "female" | "male" = "female"): string {
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
    getMannequinViewZh(angleIndex, gender),
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

async function runGeneration(prompt: string): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 55_000)

  try {
    const res = await fetch(`${OFOXAI_BASE}/v1/images/generations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OFOXAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        n: 1,
        size: "768x1152",
        response_format: "b64_json",
      }),
      signal: ctrl.signal,
      agent: new https.Agent({ rejectUnauthorized: false }),
    } as any)

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`Image generation failed: ${res.status} ${errText.slice(0, 200)}`)
    }

    const data = await res.json()
    const b64 = data.data?.[0]?.b64_json
    if (!b64) throw new Error("No image data returned")

    return b64
  } finally {
    clearTimeout(t)
  }
}

async function downloadImageBuffer(url: string): Promise<Buffer> {
  // Handle data URLs
  if (url.startsWith("data:")) {
    const b64 = url.split(",")[1]
    if (!b64) throw new Error("Invalid data URL")
    return Buffer.from(b64, "base64")
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function runEdit(prompt: string, imageUrls: string[]): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 55_000)

  try {
    // Download all reference images
    const imageBuffers = await Promise.all(imageUrls.map((url) => downloadImageBuffer(url)))
    const totalKb = (imageBuffers.reduce((s, b) => s + b.length, 0) / 1024).toFixed(0)
    console.log(`[generate-outfit] downloaded ${imageBuffers.length} reference images (${totalKb}KB total)`)

    // Build multipart/form-data manually — Node.js FormData + Blob serialization is unreliable
    const boundary = "----Ofox" + Math.random().toString(36).slice(2)
    const crlf = "\r\n"
    const parts: Buffer[] = []

    const field = (name: string, value: string) => {
      parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="${name}"${crlf}${crlf}${value}${crlf}`))
    }

    field("model", MODEL)
    field("prompt", prompt)
    field("quality", "high")
    field("n", "1")
    field("size", "768x1152")
    field("response_format", "b64_json")

    for (let i = 0; i < imageBuffers.length; i++) {
      const buf = imageBuffers[i]
      const ext = imageUrls[i].startsWith("data:") ? "jpg" : (imageUrls[i].split(".").pop()?.split("?")[0] || "jpg")
      parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="image"; filename="ref_${i}.${ext}"${crlf}Content-Type: image/${ext === "png" ? "png" : "jpeg"}${crlf}${crlf}`))
      parts.push(buf)
      parts.push(Buffer.from(crlf))
    }

    parts.push(Buffer.from(`--${boundary}--${crlf}`))
    const body = Buffer.concat(parts)

    console.log(`[generate-outfit] multipart body: ${(body.length / 1024).toFixed(0)}KB, boundary=${boundary}`)

    const res = await fetch(`${OFOXAI_BASE}/v1/images/edits`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OFOXAI_KEY}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
      signal: ctrl.signal,
      agent: new https.Agent({ rejectUnauthorized: false }),
    } as any)

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`Image edit failed: ${res.status} ${errText.slice(0, 200)}`)
    }

    const data = await res.json()
    const b64 = data.data?.[0]?.b64_json
    if (!b64) throw new Error("No image data returned from edit")

    return b64
  } finally {
    clearTimeout(t)
  }
}

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization")
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null
}

// 搭配指纹：把影响出图的属性拼成确定性字符串再哈希成短 key（同搭配 → 同 key）
function outfitFingerprint(items: OutfitItem[], angleIndex: number): string {
  const sig = items
    .map((i) => [i.name, i.color, i.material ?? "", i.sub_category ?? "", i.fit ?? "", i.length ?? "", i.neckline ?? "", i.detail ?? "", i.pattern ?? "", i.image_url ?? ""].join("|"))
    .sort().join("||")
  const hash = Array.from(`${PROMPT_VERSION}|${sig}|${angleIndex}`)
    .reduce((s, c) => ((s << 5) - s + c.charCodeAt(0)) | 0, 0)
  return (hash >>> 0).toString(36)
}

// 预设单品 image_url 是本地静态路径（/...），用户上传的是完整 http(s) URL
function hasUserItem(items: OutfitItem[]): boolean {
  return items.some((i) => !!i.image_url && !i.image_url.startsWith("/"))
}

// POST: 同步生图 + 按搭配指纹做 Supabase Storage 缓存（同搭配复用同一张图）
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
    if (!OFOXAI_KEY) {
      return NextResponse.json({ error: "Please set OFOXAI_API_KEY in .env.local" }, { status: 500 })
    }

    const body = await request.json()
    const { items, gender } = body as { gender?: string; items: OutfitItem[]; angleIndex?: number }

    // 排查分类/字段：打印关键字段
    for (const it of items) {
      console.log(`[generate-outfit] received: slot=${it.slot} name=${it.name} sub_category="${it.sub_category}" pattern="${it.pattern}" fit="${it.fit}" neckline="${it.neckline}" detail="${it.detail}"`)
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Please select at least one item" }, { status: 400 })
    }

    const angleIndex = body.angleIndex ?? 0
    const safeGender = (gender === "male" ? "male" : "female") as "female" | "male"
    const prompt = buildPrompt(items, angleIndex, safeGender)
    const promptZh = buildPromptZh(items, angleIndex, safeGender)
    console.log(`[generate-outfit] PROMPT:\n${prompt}`)

    // 缓存 key：含用户上传单品 → 按 ownerId 隔离；纯预设 → 全局共享
    const key = outfitFingerprint(items, angleIndex)
    const folder = hasUserItem(items) ? `u/${user.id}` : "g"
    const objectPath = `${folder}/${key}.jpg`
    const { data: urlData } = supabase.storage.from(RENDER_BUCKET).getPublicUrl(objectPath)
    const publicUrl = urlData.publicUrl

    // 命中：HEAD 探测公开 URL（公开 bucket 读取不需要鉴权策略）
    const cached = await fetch(publicUrl, { method: "HEAD" }).then((r) => r.ok).catch(() => false)
    if (cached) {
      console.log("[generate-outfit] cache hit:", objectPath)
      return NextResponse.json({ status: "done", imageUrl: publicUrl, prompt, promptZh, mode: "text_only", cached: true })
    }

    // 未命中：生成
    const t0 = Date.now()
    console.log(`[generate-outfit] cache miss, mode=gen, items=${items.length}`)

    const b64 = await runGeneration(prompt)
    const mode = "text_only"
    console.log(`[generate-outfit] done in ${Date.now() - t0}ms`)

    // 写入缓存，压缩为 JPEG（PNG 太大，768x1152 可达 3-6MB，加载慢）
    const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const jpegBuffer = await sharp(Buffer.from(b64, "base64"))
      .jpeg({ quality: 85, progressive: true })
      .toBuffer()
    const cacheContentType = "image/jpeg"

    const { error: upErr } = await supabaseAdmin.storage
      .from(RENDER_BUCKET)
      .upload(objectPath, jpegBuffer, { contentType: cacheContentType, upsert: true })
    if (upErr) {
      console.warn("[generate-outfit] cache upload failed, returning inline:", upErr.message)
      // 内联也用 JPEG（小很多）
      return NextResponse.json({ status: "done", imageUrl: `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`, prompt, promptZh, mode })
    }
    console.log("[generate-outfit] cache uploaded:", objectPath, `(${(jpegBuffer.length / 1024).toFixed(0)}KB)`)

    return NextResponse.json({ status: "done", imageUrl: publicUrl, prompt, promptZh, mode })
  } catch (err) {
    console.error("[generate-outfit] POST error:", err)
    return NextResponse.json(
      { error: "生成失败，请稍后重试" },
      { status: 500 }
    )
  }
}
