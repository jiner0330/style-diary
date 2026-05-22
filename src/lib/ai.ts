/**
 * AI API 封装 — DeepSeek 文本 + Seedream 图片 + 豆包视觉识别
 * 支持非流式 chat + tool-use
 */

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY!
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-pro"

const SEEDREAM_KEY = process.env.SEEDREAM_API_KEY!

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
}

interface ChatResponse {
  message: Message
  finishReason: string
  usage: { prompt: number; completion: number; total: number }
}

const TIMEOUT_MS = 60_000

export async function chat(params: ChatParams): Promise<ChatResponse> {
  const { messages, tools, model, maxTokens = 2000 } = params

  const body: Record<string, unknown> = {
    model: model || DEEPSEEK_MODEL,
    messages,
    max_tokens: maxTokens,
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
    })

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
// 使用火山引擎 ARK 豆包视觉模型（OpenAI 兼容）
const VISION_MODEL = "doubao-seed-2.0-pro"
const ARK_BASE = "https://ark.cn-beijing.volces.com/api/v3"

export interface ClassifyResult {
  category: string
  name: string
  sub_category: string | null
  color: string
  material: string | null
  pattern: string | null
  detail: string | null
  style_tags: string[]
}

// sub_category 枚举，按品类分组
const SUBCAT_ENUMS: Record<string, string[]> = {
  top: ["sweater", "shirt", "blouse", "cardigan", "hoodie", "henley", "turtleneck", "off_shoulder_corset", "halter", "off_shoulder_ls", "puff_sleeve", "off_shoulder_tee", "sweatshirt", "tank"],
  bottom: ["jeans", "trousers", "skirt", "shorts", "cargo", "chinos", "wide_jeans", "mermaid_skirt", "pencil_skirt"],
  dress: ["mini", "midi", "maxi", "off_shoulder_dress"],
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
}

export async function classifyClothing(imageUrl: string): Promise<ClassifyResult> {
  const body = {
    model: VISION_MODEL,
    messages: [
      {
        role: "user" as const,
        content: [
          {
            type: "text",
            text: `识别这张衣服照片，返回 JSON（不要其他内容），格式：

{
  "category": "品类英文",
  "name": "简短中文名称，10字以内",
  "sub_category": "版型英文，见下表",
  "color_name": "颜色中文（如：酒红、浅蓝、米白、藏青、卡其、黑色、白色、灰色、粉色、军绿、牛仔蓝）",
  "material": "材质中文（如：棉、针织、雪纺、牛仔、皮革、聚酯、真丝、羊毛、欧根纱、亚麻）",
  "pattern": "图案描述中文（如：细条纹、碎花、波点、纯色无图案）",
  "detail": "设计细节中文（如：V领、收腰、荷叶边、纽扣门襟、落肩、宽松版型）",
  "style_tags": ["风格标签，如：简约、法式、甜美、复古、街头、辣妹风、学院、通勤"]
}

category 取值：dress top bottom outerwear shoes bag accessory
sub_category 按 category 从下表选最接近的：

top: sweater | shirt | blouse | cardigan | hoodie | henley | turtleneck | off_shoulder_corset | halter | off_shoulder_ls | puff_sleeve | off_shoulder_tee | sweatshirt | tank
bottom: jeans | trousers | skirt | shorts | cargo | chinos | wide_jeans | mermaid_skirt | pencil_skirt
dress: mini | midi | maxi | off_shoulder_dress
outerwear: blazer | jacket | trench | bomber
shoes: sneakers | heels | boots | loafers
bag: tote | shoulder
accessory: necklace | earrings | scarf | sunglasses | belt | watch

如果无法确定 sub_category，选最接近的。style_tags 选 1-3 个最贴切的。`,
          },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 400,
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)

  try {
    const res = await fetch(`${ARK_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SEEDREAM_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`Vision API error ${res.status}`)

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ""

    const match = content.match(/\{[\s\S]*\}/)
    if (match) {
      const result = JSON.parse(match[0])
      const validCategories = ["dress", "top", "bottom", "outerwear", "shoes", "bag", "accessory"]
      const category = validCategories.includes(result.category) ? result.category : "top"
      const validSubcats = SUBCAT_ENUMS[category] || []
      const sub_category = validSubcats.includes(result.sub_category) ? result.sub_category : null
      const colorName = result.color_name || "米白"
      const color = COLOR_NAME_TO_HEX[colorName] || "#FAF7F4"

      return {
        category,
        name: result.name || "未命名",
        sub_category,
        color,
        material: result.material || null,
        pattern: result.pattern || null,
        detail: result.detail || null,
        style_tags: Array.isArray(result.style_tags) ? result.style_tags.slice(0, 3) : [],
      }
    }

    return { category: "top", name: "未命名", sub_category: null, color: "#FAF7F4", material: null, pattern: null, detail: null, style_tags: [] }
  } finally {
    clearTimeout(timer)
  }
}

// 复用类型
export type { Message, ToolDef, ToolCall }
