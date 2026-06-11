import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { chat, type Message, type ToolDef } from "@/lib/ai"
import { getSystemPrompt, queryRules, queryFormulas } from "@/lib/matching-rules"
import { MOCK_CLOTHING } from "@/lib/mock-data"
import { fetchWeather, weatherSummary } from "@/lib/weather"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  return null
}

// ---- 工具定义 ----

const LIST_ITEMS_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "list_items",
    description:
      "查询衣柜中的单品。可按品类、风格标签、色系、材质筛选。返回匹配单品的名称、颜色、材质、图案、风格标签、版型、细节等完整信息。",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["dress", "top", "bottom", "outerwear", "shoes", "bag", "accessory"],
          description: "单品品类",
        },
        style: {
          type: "string",
          description: "风格标签筛选，如 甜美、法式、简约",
        },
        color_group: {
          type: "string",
          enum: ["light", "dark", "warm", "cool", "neutral"],
          description: "色系筛选",
        },
        material: {
          type: "string",
          description: "材质筛选",
        },
        limit: {
          type: "number",
          description: "返回上限，默认 20",
        },
      },
      required: ["category"],
    },
  },
}

const GET_RULES_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "get_rules",
    description:
      "查询搭配规则知识库。可按场景、风格、季节、身型、性别或指定话题获取规则。用于确认搭配约束、寻找灵感、或了解特定风格的要点。",
    parameters: {
      type: "object",
      properties: {
        scene: {
          type: "string",
          enum: ["约会", "通勤", "职场通勤", "休闲", "日常", "日常休闲", "晚宴", "派对", "运动", "健身", "户外", "骑行", "徒步", "度假", "旅行", "海边", "面试", "婚礼", "酒会", "逛街", "周末", "周末brunch", "书店咖啡馆独处", "前男友聚会", "城市旅行", "正式商务"],
          description: "场景",
        },
        style: {
          type: "string",
          description: "风格，如 甜美、法式、简约、街头",
        },
        season: {
          type: "string",
          enum: ["春", "夏", "秋", "冬"],
          description: "季节，不填则用当前季节",
        },
        topic: {
          type: "string",
          enum: ["color", "silhouette", "material", "all"],
          description: "规则话题：color颜色, silhouette版型, material材质, all全部",
        },
        bodyShape: {
          type: "string",
          enum: ["梨形", "苹果形", "沙漏形", "H形", "倒三角"],
          description: "用户身型，用于筛选身型相关搭配建议",
        },
        gender: {
          type: "string",
          enum: ["male", "female"],
          description: "性别，默认 female",
        },
      },
    },
  },
}

const GET_FORMULAS_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "get_formulas",
    description:
      "查询穿搭公式（经过验证的单品组合）。可按场景、风格、季节、身型、性别筛选，返回匹配的公式及其槽位组合、变体建议。用于快速找到经过验证的搭配方案。",
    parameters: {
      type: "object",
      properties: {
        scene: {
          type: "string",
          enum: ["约会", "通勤", "职场通勤", "休闲", "日常", "日常休闲", "晚宴", "派对", "运动", "健身", "户外", "骑行", "徒步", "度假", "旅行", "海边", "面试", "婚礼", "酒会", "逛街", "周末", "周末brunch", "书店咖啡馆独处", "前男友聚会", "城市旅行", "正式商务"],
          description: "场景",
        },
        style: {
          type: "string",
          description: "风格，如 甜美、法式、简约、街头",
        },
        season: {
          type: "string",
          enum: ["春", "夏", "秋", "冬"],
          description: "季节，不填则用当前季节",
        },
        bodyShape: {
          type: "string",
          enum: ["梨形", "苹果形", "沙漏形", "H形", "倒三角"],
          description: "用户身型",
        },
        gender: {
          type: "string",
          enum: ["male", "female"],
          description: "性别，默认 female",
        },
        maxDifficulty: {
          type: "number",
          description: "难度上限 1-5，如新手填2",
        },
      },
    },
  },
}



const GET_WEATHER_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "get_weather",
    description:
      "获取用户所在城市的实时天气和未来3日预报（温度、体感温度、降水、风力、湿度）。当用户需要外出穿搭建议或提及户外场景时使用此工具。",
    parameters: {
      type: "object",
      properties: {},
    },
  },
}

const TOOLS = [LIST_ITEMS_TOOL, GET_RULES_TOOL, GET_FORMULAS_TOOL, GET_WEATHER_TOOL]

// ---- 类型 ----

interface OutfitSlot {
  dress: string | null
  top: string | null
  bottom: string | null
  outerwear: string | null
  shoes: string | null
  bag: string | null
  accessories: string[]
}

// ---- 工具执行 ----

const LIGHT_HEX = ["#F5F5F5", "#FAF7F4", "#E8E4DF", "#E8DED1", "#F5F0D0", "#E8D8A0", "#E8B4B8"]
const DARK_HEX = ["#2A2A2A", "#3A3A3A", "#5C5C5C", "#1A2A4A", "#3A5A3A", "#8B2252"]
const WARM_HEX = ["#D4A5A5", "#D4C5C2", "#E8B4B8", "#C4A8A3", "#DDA040", "#E8D8A0", "#8B2252", "#5C3A2A", "#D4C5A0"]
const COOL_HEX = ["#6B8FA3", "#7B8FA3", "#7B9CB5", "#A8C4D4", "#A3B5C4", "#B4C1A8", "#3A5A3A", "#B5C1B4", "#88C8A0", "#50B878", "#98D8B8", "#C1D8C3"]

function colorGroup(hex: string): string | null {
  if (LIGHT_HEX.includes(hex)) return "light"
  if (DARK_HEX.includes(hex)) return "dark"
  if (WARM_HEX.includes(hex)) return "warm"
  if (COOL_HEX.includes(hex)) return "cool"
  // some colors belong to multiple groups
  const warmish = ["#C5BFB8", "#9A9A9A"]
  if (warmish.includes(hex)) return "warm"
  return null
}

// executeTool 闭包需要访问 currentOutfit + user auth token + coords
function makeExecuteTool(currentOutfit: OutfitSlot, userToken: string | null, coords?: { lat: number; lon: number } | null) {
  return async function executeTool(name: string, args: Record<string, unknown>) {
    switch (name) {
      case "list_items": {
        const category = args.category as string
        const style = args.style as string | undefined
        const colorGroupFilter = args.color_group as string | undefined
        const material = args.material as string | undefined
        const rawLimit = args.limit as number | undefined
        const limit = typeof rawLimit === "number" ? rawLimit : 20

        // 1. Mock 数据
        let mockItems = MOCK_CLOTHING.filter((i) => i.category === category)
        if (style) {
          mockItems = mockItems.filter((i) => i.style_tags.some((t) => t.includes(style) || style.includes(t)))
        }
        if (colorGroupFilter) {
          mockItems = mockItems.filter((i) => colorGroup(i.color) === colorGroupFilter)
        }
        if (material) {
          mockItems = mockItems.filter((i) => i.material?.includes(material))
        }

        // 2. 个人衣橱查询
        let personalResult: Record<string, unknown>[] = []
        if (userToken) {
          try {
            const supabase = createClient(supabaseUrl, supabaseAnonKey, {
              global: { headers: { Authorization: `Bearer ${userToken}` } },
            })
            let query = supabase.from("clothing_items").select("*").eq("category", category)
            if (style) {
              query = query.contains("style_tags", [style])
            }
            if (material) {
              query = query.ilike("material", `%${material}%`)
            }
            const { data } = await query.limit(limit)
            personalResult = (data || []).map((i: Record<string, unknown>) => ({
              id: i.id,
              name: i.name,
              category: i.category,
              sub_category: i.sub_category || null,
              color: i.color || "#9A9A9A",
              color_group: i.color_group || null,
              material: i.material || null,
              pattern: i.pattern || null,
              fit: i.fit || null,
              length: i.length || null,
              neckline: i.neckline || null,
              detail: i.detail || null,
              style_tags: i.style_tags || [],
              source: "personal",
            }))
          } catch (e) {
            console.warn("[chat] personal wardrobe query failed:", e)
          }
        }

        // 3. 合并结果
        const mockFormatted = mockItems.slice(0, limit).map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          sub_category: i.sub_category,
          color: i.color,
          color_group: i.color_group,
          material: i.material,
          pattern: i.pattern,
          fit: i.fit,
          length: i.length,
          neckline: i.neckline,
          detail: i.detail,
          style_tags: i.style_tags,
          source: "system",
        }))

        const allItems = [...mockFormatted, ...personalResult].slice(0, limit)
        return { count: allItems.length, items: allItems }
      }

      case "get_rules": {
        const scene = args.scene as string | undefined
        const style = args.style as string | undefined
        const season = args.season as string | undefined
        const topic = args.topic as string | undefined
        const bodyShape = args.bodyShape as string | undefined
        const gender = args.gender as "male" | "female" | undefined
        return { rules: queryRules({ scene, style, season, topic, bodyShape, gender }) }
      }

      case "get_formulas": {
        const scene = args.scene as string | undefined
        const style = args.style as string | undefined
        const season = args.season as string | undefined
        const bodyShape = args.bodyShape as string | undefined
        const gender = args.gender as "male" | "female" | undefined
        const maxDifficulty = args.maxDifficulty as number | undefined
        return { formulas: queryFormulas({ scene, style, season, bodyShape, gender, maxDifficulty }) }
      }


      case "get_weather": {
        if (!coords || !coords.lat || !coords.lon) {
          return { error: "未获取到位置信息，无法查询天气。请允许浏览器定位权限。" }
        }
        const data = await fetchWeather(coords.lat, coords.lon)
        if (!data) return { error: "天气服务暂不可用，请稍后重试" }
        return { summary: weatherSummary(data), detail: data }
      }

      default:
        return { error: `未知工具: ${name}` }
    }
  }
}

// ---- Agent 循环 ----

const MAX_ROUNDS = 3

/** 从 AI 响应中提取 JSON 搭配方案 */
function parsePlansFromText(text: string): Record<string, unknown>[] {
  const plans: Record<string, unknown>[] = []
  const seen = new Set<string>()

  // 匹配 ```json ... ``` 或 ``` ... ``` 代码块
  const fenceRe = /```(?:\w+)?\s*\n?([\s\S]*?)```/g
  let match
  while ((match = fenceRe.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[1].trim())
      // Accept any JSON with items array (with or without "plan" key)
      if (obj.items && Array.isArray(obj.items)) {
        const key = JSON.stringify(obj.plan ?? match[1].trim().slice(0, 60))
        if (!seen.has(key)) { seen.add(key); plans.push(obj) }
      }
    } catch { /* skip */ }
  }

  // 兜底：匹配裸 JSON（无 code fence）
  // 同时搜索 "plan" 和 "items" 标记
  const markers = [/\"plan\"\s*:\s*\d+/, /\"items\"\s*:\s*\[/]
  for (const markerRe of markers) {
    const rawRe = new RegExp(markerRe.source, "g")
    while ((match = rawRe.exec(text)) !== null) {
      let start = match.index
      while (start > 0 && text[start] !== "{") start--
      if (text[start] !== "{") continue
      let depth = 0; let i = start
      for (; i < text.length; i++) {
        if (text[i] === "{") depth++
        else if (text[i] === "}") { depth--; if (depth === 0) break }
      }
      if (depth === 0 && i > match.index) {
        try {
          const obj = JSON.parse(text.slice(start, i + 1))
          if (obj.items && Array.isArray(obj.items)) {
            const key = JSON.stringify(obj.plan ?? text.slice(start, start + 60))
            if (!seen.has(key)) { seen.add(key); plans.push(obj) }
          }
        } catch { /* skip */ }
      }
    }
  }
  return plans
}

/** 从文本中清除 JSON 代码块和裸 JSON 对象 */
function stripJSONFromText(text: string): string {
  // 移除 ```json ... ``` 和 ``` ... ``` 代码块
  let cleaned = text.replace(/```[\s\S]*?```/g, "")
  // 移除残留的孤立 ``` 标记
  cleaned = cleaned.replace(/```/g, "")

  // 收集所有裸 JSON 对象的起止位置（先收集后移除，避免字符串突变导致 regex lastIndex 错位）
  const ranges: [number, number][] = []
  // 同时匹配 "plan" 和 "items" 两种 JSON 标记
  const markers = [/\"plan\"\s*:\s*\d+/, /\"items\"\s*:\s*\[/]
  for (const markerRe of markers) {
    const rawRe = new RegExp(markerRe.source, "g")
    let match
    while ((match = rawRe.exec(cleaned)) !== null) {
      let start = match.index
      while (start > 0 && cleaned[start] !== "{") start--
      if (cleaned[start] !== "{") continue
      let depth = 0; let i = start
      for (; i < cleaned.length; i++) {
        if (cleaned[i] === "{") depth++
        else if (cleaned[i] === "}") { depth--; if (depth === 0) break }
      }
      if (depth === 0 && i > match.index) ranges.push([start, i])
    }
  }

  // 逆序移除，保证前面的索引不受影响
  for (let r = ranges.length - 1; r >= 0; r--) {
    cleaned = cleaned.slice(0, ranges[r][0]) + cleaned.slice(ranges[r][1] + 1)
  }

  // 清理多余空行
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n")
  return cleaned.trim()
}

async function agentLoop(
  userMessage: string,
  currentOutfit: OutfitSlot,
  userToken: string | null,
  coords?: { lat: number; lon: number } | null,
  gender?: "female" | "male",
  bodyType?: string | null,
  styleTags?: string[],
  outfitContext?: string | null,
): Promise<{ content: string; rounds: number; plans: Record<string, unknown>[] }> {
  const messages: Message[] = [
    { role: "system", content: getSystemPrompt({ gender, bodyType, styleTags }) },
  ]
  // 注入搭配面板参考信息（软性提示，AI 自行判断是否使用）
  if (outfitContext) {
    const contextBlock = `## 用户搭配面板参考\n用户当前搭配面板中有以下单品（仅供参考，用户的实际需求可能与这些单品相关也可能无关，请根据用户提问自行判断是否围绕这些单品做搭配）：\n${outfitContext}`
    messages.push({ role: "user", content: contextBlock })
  }
  messages.push({ role: "user", content: userMessage })

  const executeTool = makeExecuteTool(currentOutfit, userToken, coords)
  let rounds = 0

  while (rounds < MAX_ROUNDS) {
    rounds++
    const { message, finishReason } = await chat({ messages, tools: TOOLS, maxTokens: 4000 })

    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push({
        role: "assistant",
        content: message.content || "",
        tool_calls: message.tool_calls,
        ...(message.reasoning_content ? { reasoning_content: message.reasoning_content } : {}),
      })

      for (const tc of message.tool_calls) {
        const args = JSON.parse(tc.function.arguments || "{}")
        console.log(`[agent] tool_call: ${tc.function.name}(${JSON.stringify(args)})`)
        const result = await executeTool(tc.function.name, args)
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: tc.function.name,
          content: JSON.stringify(result),
        })
      }

      // 追加 user 消息强制引导下一轮输出，防止模型无限调工具或返回空内容
      messages.push({
        role: "user",
        content: "以上是工具返回的结果，现在请直接输出恰好 2 套搭配方案（不要继续调用工具）。",
      })
      continue
    }

    // 有实际内容才返回，否则继续下一轮
    if (message.content && message.content.trim().length > 0) {
      const plans = parsePlansFromText(message.content)
      const cleaned = stripJSONFromText(message.content)
      const removed = message.content.length - cleaned.length
      console.log(`[agent] plans=${plans.length}, removed=${removed}, cleaned=${cleaned.length}, original=${message.content.length}`)
      // Diagnose JSON format issues: log snippet around "plan" or "items" keywords
      if (message.content.includes("plan") || message.content.includes("items")) {
        const idx = Math.max(message.content.indexOf("plan"), message.content.indexOf("items"))
        const snippet = message.content.slice(Math.max(0, idx - 30), idx + 200)
        console.log(`[agent] content snippet around plan/items: ${JSON.stringify(snippet)}`)
      }
      if (message.content.includes("```")) {
        const fenceCount = (message.content.match(/```/g) || []).length
        console.log(`[agent] fence markers: ${fenceCount}`)
      }
      return { content: cleaned, rounds, plans }
    }
  }

  return { content: "抱歉，搭配分析超时了，请简化一下需求再试～", rounds, plans: [] }
}

// ---- Route Handler ----

const EMPTY_OUTFIT: OutfitSlot = {
  dress: null, top: null, bottom: null,
  outerwear: null, shoes: null, bag: null,
  accessories: [],
}

export async function POST(request: NextRequest) {
  try {
    const token = getToken(request)
    let userToken: string | null = null
    console.log(`[chat] token present: ${!!token}`)
    if (token) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
      if (user) {
        userToken = token
        console.log(`[chat] user authenticated: ${user.id}`)
      } else {
        console.log(`[chat] auth failed: ${authErr?.message || "unknown"}`)
      }
    }

    const body = await request.json()
    const { message, currentOutfit, coords, gender, bodyType, styleTags, outfitContext } = body as {
      message: string
      currentOutfit?: OutfitSlot
      coords?: { lat: number; lon: number } | null
      gender?: "female" | "male"
      bodyType?: string | null
      styleTags?: string[]
      outfitContext?: string | null
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "请描述你的搭配需求" }, { status: 400 })
    }

    const outfit = currentOutfit || EMPTY_OUTFIT
    const filledSlots = Object.entries(outfit).filter(([, v]) => v).length
    console.log(`[chat] request: ${filledSlots} outfit slots, message len=${message.length}`)
    const { content, rounds, plans } = await agentLoop(message.trim(), outfit, userToken, coords, gender, bodyType, styleTags, outfitContext)
    console.log(`[chat] AI (${rounds} rounds):`, content.slice(0, 120))

    return NextResponse.json({ content, rounds, plans })
  } catch (err) {
    console.error("[chat] Error:", err)
    return NextResponse.json({ error: "搭配服务异常，请稍后重试" }, { status: 500 })
  }
}
