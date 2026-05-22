import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { chat, type Message, type ToolDef } from "@/lib/ai"
import { getSystemPrompt, queryRules, queryFormulas, queryHacks, getCurrentSeason } from "@/lib/matching-rules"
import { MOCK_CLOTHING, getItemById } from "@/lib/mock-data"
import { fetchWeather, weatherSummary, type WeatherData } from "@/lib/weather"

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
          enum: ["约会", "通勤", "休闲", "晚宴", "日常"],
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
          enum: ["约会", "通勤", "休闲", "晚宴", "日常"],
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

const GET_HACKS_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "get_hacks",
    description:
      "查询穿搭技巧（塞衣角、卷袖口、挽裤脚、配饰、腰带等实操技巧）。可按场景、身型、类别筛选。用于给搭配方案添加细节优化建议。",
    parameters: {
      type: "object",
      properties: {
        scene: {
          type: "string",
          enum: ["约会", "通勤", "休闲", "晚宴", "日常"],
          description: "场景",
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
        category: {
          type: "string",
          enum: ["塞衣角", "卷袖口", "挽裤脚", "配饰", "腰带", "衬衫", "叠穿细节", "比例调整"],
          description: "技巧类别",
        },
      },
    },
  },
}

const GET_OUTFIT_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "get_outfit",
    description:
      "查看用户当前已搭配的单品（即已选中放入搭配方案的）。用于了解已有选择、避免重复推荐、或基于现有搭配做增量修改。无参数，直接返回当前搭配状态。",
    parameters: {
      type: "object",
      properties: {
        dummy: {
          type: "string",
          description: "占位参数，传空字符串即可",
        },
      },
    },
  },
}

const TOOLS = [LIST_ITEMS_TOOL, GET_RULES_TOOL, GET_FORMULAS_TOOL, GET_HACKS_TOOL, GET_OUTFIT_TOOL]

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
const COOL_HEX = ["#6B8FA3", "#7B9CB5", "#A8C4D4", "#A3B5C4", "#B4C1A8", "#3A5A3A", "#B5C1B4"]

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

// executeTool 闭包需要访问 currentOutfit + user auth token
function makeExecuteTool(currentOutfit: OutfitSlot, userToken: string | null) {
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
              material: i.material || null,
              pattern: i.pattern || null,
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
          material: i.material,
          pattern: i.pattern,
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

      case "get_hacks": {
        const scene = args.scene as string | undefined
        const bodyShape = args.bodyShape as string | undefined
        const gender = args.gender as "male" | "female" | undefined
        const category = args.category as string | undefined
        return { hacks: queryHacks({ scene, bodyShape, gender, category }) }
      }

      case "get_outfit": {
        const slots = ["dress", "top", "bottom", "outerwear", "shoes", "bag"] as const
        const filled: Record<string, unknown> = {}

        // 先查 mock，再查个人衣橱
        const getItemFromAny = async (id: string) => {
          const mock = getItemById(id)
          if (mock) {
            console.log(`[chat] get_outfit found ${id} in mock: ${mock.name}`)
            return { id, name: mock.name, color: mock.color, style_tags: mock.style_tags, category: mock.category }
          }
          console.log(`[chat] get_outfit ${id} not in mock, checking personal (token: ${!!userToken})`)
          if (userToken) {
            try {
              const supabase = createClient(supabaseUrl, supabaseAnonKey, {
                global: { headers: { Authorization: `Bearer ${userToken}` } },
              })
              const { data, error } = await supabase.from("clothing_items").select("*").eq("id", id).single()
              if (error) {
                console.log(`[chat] get_outfit personal query error: ${error.message}`)
              } else if (data) {
                console.log(`[chat] get_outfit found ${id} in personal: ${data.name}`)
                return { id: data.id, name: data.name, color: data.color || "#9A9A9A", style_tags: data.style_tags || [], category: data.category }
              } else {
                console.log(`[chat] get_outfit ${id} not found in personal either`)
              }
            } catch (e) {
              console.log(`[chat] get_outfit personal query exception:`, e)
            }
          } else {
            console.log(`[chat] get_outfit no userToken, can't query personal for ${id}`)
          }
          return null
        }

        for (const slot of slots) {
          const id = currentOutfit[slot]
          if (id && typeof id === "string") {
            filled[slot] = await getItemFromAny(id)
          } else {
            filled[slot] = null
          }
        }

        const accResults = await Promise.all(
          currentOutfit.accessories.map((id) => getItemFromAny(id))
        )
        const accessories = accResults.filter(Boolean)
        return { ...filled, accessories }
      }

      default:
        return { error: `未知工具: ${name}` }
    }
  }
}

// ---- Agent 循环 ----

const MAX_ROUNDS = 5

async function agentLoop(
  userMessage: string,
  currentOutfit: OutfitSlot,
  userToken: string | null,
  weather: WeatherData | null,
): Promise<{ content: string; rounds: number }> {
  const weatherCtx = weather ? `\n\n## 当前天气\n${weatherSummary(weather)}` : ""
  const messages: Message[] = [
    { role: "system", content: getSystemPrompt() + weatherCtx },
    { role: "user", content: userMessage },
  ]

  const executeTool = makeExecuteTool(currentOutfit, userToken)
  let rounds = 0

  while (rounds < MAX_ROUNDS) {
    rounds++
    const { message, finishReason } = await chat({ messages, tools: TOOLS, maxTokens: 2000 })

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
      continue
    }

    return { content: message.content, rounds }
  }

  return { content: "抱歉，搭配分析超时了，请简化一下需求再试～", rounds }
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
    const { message, currentOutfit, coords } = body as {
      message: string
      currentOutfit?: OutfitSlot
      coords?: { lat: number; lon: number } | null
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "请描述你的搭配需求" }, { status: 400 })
    }

    const outfit = currentOutfit || EMPTY_OUTFIT
    console.log(`[chat] outfit received:`, JSON.stringify(outfit))

    // 获取天气数据
    let weather: WeatherData | null = null
    if (coords && coords.lat && coords.lon) {
      weather = await fetchWeather(coords.lat, coords.lon)
      if (weather) console.log(`[chat] weather: ${weatherSummary(weather)}`)
    }

    console.log(`[chat] User: ${message}`)
    const { content, rounds } = await agentLoop(message.trim(), outfit, userToken, weather)
    console.log(`[chat] AI (${rounds} rounds):`, content.slice(0, 120))

    return NextResponse.json({ content, rounds })
  } catch (err) {
    console.error("[chat] Error:", err)
    const message = err instanceof Error ? err.message : "未知错误"
    return NextResponse.json({ error: `搭配服务异常: ${message}` }, { status: 500 })
  }
}
