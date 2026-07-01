/**
 * AI API 封装 — DeepSeek 文本 + ofox.ai 视觉识别 (GPT-4o) + ofox.ai 图片生成 (GPT Image)
 * 支持非流式 chat + tool-use
 */

import https from "https"
import sharp from "sharp"

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY!
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-pro"

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

interface ToolDef {
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

interface Message {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
  reasoning_content?: string
}

interface ToolCall {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string
  }
}

interface ChatParams {
  messages: Message[]
  tools?: ToolDef[]
  model?: string
  maxTokens?: number
  temperature?: number
}

interface ChatResponse {
  message: Message
  finishReason: string
  usage: { prompt: number; completion: number; total: number }
}

const TIMEOUT_MS = 120_000

export async function chat(params: ChatParams): Promise<ChatResponse> {
  const { messages, tools, model, maxTokens = 4000, temperature = 0.3 } = params

  const body: Record<string, unknown> = {
    model: model || DEEPSEEK_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature,
  }

  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = "auto"
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    // 文本对话优先走 DeepSeek（可直连）
    const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEEPSEEK_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      agent: httpsAgent,
    } as any)

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`Chat API error ${res.status}: ${errText}`)
    }

    const data = await res.json()
    const choice = data.choices?.[0]
    if (!choice) throw new Error("Chat API returned no choices")

    const msg: Message = {
      role: choice.message.role,
      content: choice.message.content || "",
    }
    if (choice.message.tool_calls) msg.tool_calls = choice.message.tool_calls
    if (choice.message.reasoning_content) msg.reasoning_content = choice.message.reasoning_content

    return {
      message: msg,
      finishReason: choice.finish_reason ?? "stop",
      usage: data.usage ?? { prompt: 0, completion: 0, total: 0 },
    }
  } finally {
    clearTimeout(timer)
  }
}

// 视觉识别：上传衣服照片 → 提取完整单品信息
// 使用 ofox.ai Gemini 2.5 Flash 视觉模型（颜色识别准确度高）
const VISION_MODEL = "gpt-4o"
const OFOXAI_BASE = process.env.OFOXAI_BASE_URL || "https://api.ofox.ai"
const OFOXAI_KEY = process.env.OFOXAI_API_KEY!

export interface ClassifyResult {
  category: string
  name: string
  sub_category: string | null
  color: string
  material: string | null
  pattern: string | null
  detail: string | null
  style_tags: string[]
  fit: string | null
  length: string | null
  neckline: string | null
  english_description: string | null
}

// sub_category 枚举，按品类分组
const SUBCAT_ENUMS: Record<string, string[]> = {
  top: ["sweater", "shirt", "blouse", "cardigan", "hoodie", "henley", "turtleneck", "off_shoulder_corset", "halter", "off_shoulder_ls", "puff_sleeve", "off_shoulder_tee", "sweatshirt", "tank", "t_shirt", "polo", "cami"],
  bottom: ["jeans", "trousers", "skirt", "shorts", "cargo", "chinos", "wide_jeans", "mermaid_skirt", "pencil_skirt", "tiered_tulle_skirt", "a_line_skirt", "pleated_skirt"],
  dress: ["slip_dress", "bodycon_dress", "a_line_dress", "shirt_dress", "wrap_dress", "mini", "midi", "maxi", "off_shoulder_dress", "qipao"],
  outerwear: ["blazer", "jacket", "trench", "bomber"],
  shoes: ["sneakers", "heels", "boots", "loafers"],
  bag: ["tote", "shoulder"],
  accessory: ["necklace", "earrings", "scarf", "sunglasses", "belt", "watch"],
}

// 最接近的颜色名 → hex 映射
const COLOR_NAME_TO_HEX: Record<string, string> = {
  "白色": "#F5F5F5", "米白": "#FAF7F4", "米白色": "#FAF7F4", "奶白": "#FAF7F4",
  "黑色": "#2A2A2A", "深灰": "#5C5C5C", "灰色": "#9A9A9A", "浅灰": "#B5C1B4",
  "蓝色": "#6B8FA3", "浅蓝": "#A8C4D4", "深蓝": "#1A2A4A", "藏青": "#1A2A4A",
  "红色": "#8B2252", "酒红": "#8B2252", "粉色": "#E8B4B8", "裸粉": "#D4C5C2",
  "卡其": "#D4C5A0", "米色": "#D4C5A0", "驼色": "#D4C5A0", "燕麦": "#D4C5A0",
  "棕色": "#5C3A2A", "深棕": "#5C3A2A", "黄色": "#F5F0D0", "鹅黄": "#E8D8A0",
  "绿色": "#3A5A3A", "军绿": "#B4C1A8", "墨绿": "#3A5A3A", "灰绿": "#B5C1B4",
  "紫色": "#D4A5A5", "橙色": "#DDA040", "牛仔蓝": "#7B9CB5",
  "亮绿": "#88C8A0", "翠绿": "#50B878", "薄荷绿": "#98D8B8", "浅绿": "#C1D8C3",
  "青绿": "#7EC8A0", "草绿": "#78C850", "荧光绿": "#B8E888", "深绿": "#2A5A2A",
  "金色": "#D4B060", "银色": "#D4D4D4",
  "姜黄": "#DDA040", "豆沙粉": "#C4A8A3",
}

async function prepareImageSrc(input: string | ArrayBuffer, _mimeType: string): Promise<string> {
  if (typeof input === "string") return input

  // Resize to max 1024px, convert to JPEG (always use image/jpeg regardless of input format)
  const resized = await sharp(Buffer.from(input))
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()

  const base64 = resized.toString("base64")
  console.log(`[vision] image resized: ${(Buffer.byteLength(input as ArrayBuffer) / 1024).toFixed(0)}KB → ${(resized.length / 1024).toFixed(0)}KB (base64: ${(base64.length / 1024).toFixed(0)}KB)`)
  return `data:image/jpeg;base64,${base64}`
}

export async function classifyClothing(input: string | ArrayBuffer, mimeType = "image/jpeg"): Promise<ClassifyResult> {
  const imageSrc = await prepareImageSrc(input, mimeType)

  const body = {
    model: VISION_MODEL,
    messages: [
      {
        role: "user" as const,
        content: [
          {
            type: "text",
            text: `识别这件服装单品，只输出JSON，不要其他文字。

{
  "category": "品类",
  "name": "中文名称",
  "sub_category": "版型",
  "color_name": "颜色",
  "material": "材质",
  "pattern": "图案",
  "fit": "紧身|修身|合身|宽松|oversized 或null",
  "length": "短款|常规|中长|长款 或null",
  "neckline": "圆领|V领|方领|高领|翻领|一字肩|吊带|无领 或null",
  "detail": "设计细节",
  "style_tags": ["1-3个标签"],
  "english_description": "Detailed English description for AI image generation. Cover: silhouette, color (use precise English color names like 'pale blue', 'cream white', 'charcoal black'), pattern (translate to English), material texture, fit, neckline, sleeve type, length, and any distinctive design details. Write as a natural flowing sentence suitable as a prompt for an image model."
}

category(品类): dress|top|bottom|outerwear|shoes|bag|accessory
sub_category: top: sweater|shirt|blouse|cardigan|hoodie|henley|turtleneck|off_shoulder_corset|halter|off_shoulder_ls|puff_sleeve|off_shoulder_tee|sweatshirt|tank|t_shirt|polo|cami / bottom: jeans|trousers|skirt|shorts|cargo|chinos|wide_jeans|mermaid_skirt|pencil_skirt|tiered_tulle_skirt|a_line_skirt|pleated_skirt / dress: slip_dress(吊带)|bodycon_dress(紧身)|a_line_dress(A字)|shirt_dress(衬衫裙)|wrap_dress(裹身裙)|mini|midi|maxi|off_shoulder_dress|qipao / outerwear: blazer|jacket|trench|bomber / shoes: sneakers|heels|boots|loafers / bag: tote|shoulder / accessory: necklace|earrings|scarf|sunglasses|belt|watch
color_name: 亮片看基底色(绿色亮片→亮绿)!可选:白色|米白|黑色|深灰|灰色|浅灰|浅蓝|深蓝|藏青|蓝色|牛仔蓝|酒红|红色|粉色|裸粉|豆沙粉|卡其|驼色|棕色|黄色|姜黄|绿色|墨绿|军绿|灰绿|亮绿|翠绿|薄荷绿|浅绿|紫色|橙色
style_tags仅可选: 简约|法式|甜美|复古|街头|辣妹风|学院|通勤|波西米亚|运动`,
          },
          { type: "image_url", image_url: { url: imageSrc } },
        ],
      },
    ],
    max_tokens: 1024,
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)

  try {
    const res = await fetch(`${OFOXAI_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OFOXAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      agent: httpsAgent,
    } as any)

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.error(`[vision] API error ${res.status}: ${errText}`)
      throw new Error(`Vision API error ${res.status}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ""
    const finishReason = data.choices?.[0]?.finish_reason || "unknown"
    console.log(`[vision] model=${data.model || VISION_MODEL}, finish=${finishReason}, len=${content.length}, full=${JSON.stringify(content)}`)

    // Validate: response too short means API truncated, likely image inaccessible or model issue
    if (content.length < 100) {
      console.error(`[vision] TRUNCATED: only ${content.length} chars, finish=${finishReason}, input_type=${typeof input}`)
      throw new Error(`Vision API returned truncated response (${content.length} chars, finish=${finishReason}). Image may be inaccessible or too large.`)
    }

    const match = content.match(/\{[\s\S]*\}/)
    console.log(`[vision] match=${!!match}, jsonLen=${match ? match[0].length : 0}`)
    if (match) {
      const result = JSON.parse(match[0])
      const validCategories = ["dress", "top", "bottom", "outerwear", "shoes", "bag", "accessory"]
      const category = validCategories.includes(result.category) ? result.category : "top"
      const validSubcats = SUBCAT_ENUMS[category] || []
      const sub_category = validSubcats.includes(result.sub_category) ? result.sub_category : null
      const colorName = result.color_name || "米白"
      const color = COLOR_NAME_TO_HEX[colorName] || "#FAF7F4"

      const validFits = ["紧身", "修身", "合身", "宽松", "oversized"]
      const validLengths = ["短款", "常规", "中长", "长款"]
      const validNecklines = ["圆领", "V领", "方领", "高领", "翻领", "一字肩", "吊带", "无领"]
      return {
        category,
        name: result.name || "未命名",
        sub_category,
        color,
        material: result.material || null,
        pattern: result.pattern || null,
        fit: validFits.includes(result.fit) ? result.fit : null,
        length: validLengths.includes(result.length) ? result.length : null,
        neckline: validNecklines.includes(result.neckline) ? result.neckline : null,
        detail: result.detail || null,
        style_tags: Array.isArray(result.style_tags) ? result.style_tags.slice(0, 3) : [],
        english_description: result.english_description || null,
      }
    }

    return { category: "top", name: "未命名", sub_category: null, color: "#FAF7F4", material: null, pattern: null, fit: null, length: null, neckline: null, detail: null, style_tags: [], english_description: null }
  } finally {
    clearTimeout(timer)
  }
}

// 复用类型
export type { Message, ToolDef, ToolCall }
