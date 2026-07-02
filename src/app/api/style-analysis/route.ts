import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { chat } from "@/lib/ai"

export const maxDuration = 30

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ─── Types ───
interface WardrobeItem {
  name: string
  category: string
  sub_category: string | null
  color: string
  color_group: string | null
  material: string | null
  pattern: string | null
  fit: string | null
  style_tags: string[]
}

interface UserProfile {
  gender: string
  body_type: string
  skin_tone: string
  style_tags: string[]
  height_range?: string
}

// ─── Auth ───
function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization")
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null
}

// ─── Helpers ───
const CATEGORY_CN: Record<string, string> = {
  top: "上衣", bottom: "下装", dress: "连衣裙",
  outerwear: "外套", shoes: "鞋子", bag: "包", accessory: "配饰",
}

const BODY_TYPE_CN: Record<string, string> = {
  pear: "梨形", hourglass: "沙漏形", rectangle_f: "矩形",
  apple: "苹果形", inverted_triangle_f: "倒三角",
}

function buildAnalysisPrompt(profile: UserProfile, items: WardrobeItem[]): string {
  const categoryBreakdown: Record<string, number> = {}
  const styleTagFreq: Record<string, number> = {}
  const colorGroupFreq: Record<string, number> = {}
  const patternFreq: Record<string, number> = {}
  const materialFreq: Record<string, number> = {}
  const fitFreq: Record<string, number> = {}

  for (const item of items) {
    const cat = CATEGORY_CN[item.category] || item.category
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1
    for (const tag of item.style_tags) {
      styleTagFreq[tag] = (styleTagFreq[tag] || 0) + 1
    }
    if (item.color_group) {
      colorGroupFreq[item.color_group] = (colorGroupFreq[item.color_group] || 0) + 1
    }
    if (item.pattern) {
      patternFreq[item.pattern] = (patternFreq[item.pattern] || 0) + 1
    }
    if (item.material) {
      materialFreq[item.material] = (materialFreq[item.material] || 0) + 1
    }
    if (item.fit) {
      fitFreq[item.fit] = (fitFreq[item.fit] || 0) + 1
    }
  }

  const itemList = items.map((i) => {
    const parts = [`[${CATEGORY_CN[i.category] || i.category}] ${i.name}`]
    if (i.color) parts.push(`颜色:${i.color}`)
    if (i.color_group) parts.push(`色系:${i.color_group}`)
    if (i.pattern) parts.push(`图案:${i.pattern}`)
    if (i.material) parts.push(`材质:${i.material}`)
    if (i.fit) parts.push(`版型:${i.fit}`)
    if (i.style_tags.length > 0) parts.push(`风格:${i.style_tags.join("/")}`)
    return parts.join(" | ")
  }).join("\n")

  const sortedTags = Object.entries(styleTagFreq).sort((a, b) => b[1] - a[1])
  const topTags = sortedTags.slice(0, 5).map(([t, c]) => `${t}(${c}件)`).join("、")

  return `## 用户画像
性别: ${profile.gender === "male" ? "男" : "女"}
身材: ${BODY_TYPE_CN[profile.body_type] || profile.body_type}
肤色: ${profile.skin_tone === "warm" ? "暖皮" : profile.skin_tone === "cool" ? "冷皮" : "中性皮"}
用户自选风格标签: ${profile.style_tags.join("、")}

## 衣橱统计
共 ${items.length} 件单品
品类分布: ${Object.entries(categoryBreakdown).map(([k, v]) => `${k}${v}件`).join("、")}
Top风格标签: ${topTags}
色系分布: ${Object.entries(colorGroupFreq).map(([k, v]) => `${k}(${v}件)`).join("、")}
图案: ${Object.entries(patternFreq).map(([k, v]) => `${k}(${v}件)`).join("、") || "无图案单品居多"}
材质: ${Object.entries(materialFreq).map(([k, v]) => `${k}(${v}件)`).join("、") || "材质较分散"}
版型偏好: ${Object.entries(fitFreq).map(([k, v]) => `${k}(${v}件)`).join("、")}

## 单品列表
${itemList}`
}

function buildSystemPrompt(): string {
  return `你是一个时尚风格分析师，叫"搭搭"。你的任务是分析用户的衣橱数据，生成一份个性化的风格人格描述。

要求：
1. 基于真实数据得出结论，不要编造数据中没有的特征
2. 找出用户衣橱中的"矛盾"或"隐藏偏好"——比如用户自选的风格标签和实际单品不完全一致
3. 语言要有温度和人格感，像朋友在评价你的穿搭风格，不要太AI腔
4. 输出严格JSON，不要markdown包裹

输出JSON结构：
{
  "personaLabel": "2-4字风格人格标签，如'盐系学院风'、'甜酷辣妹'、'慵懒法式控'",
  "personaDescription": "一段150-200字的人格化描述。从数据中找3个具体特征：1)最突出的品类偏好 2)色系/材质偏好 3)一个有趣的矛盾或隐藏偏好。语气温暖、像朋友对话。用'你'称呼用户。",
  "styleKeywords": ["3-5个关键词"],
  "funFacts": [
    "基于具体数据的趣味发现，如'你的衣橱里格纹单品占了30%，但你选了简约风作为主标签——有隐藏的复古魂'",
    "第二条趣味发现"
  ],
  "colorPalette": "1句话概括色系偏好",
  "silhouettePref": "1句话概括廓形/版型偏好"
}

注意：
- personaLabel不要用"简约"这种太泛的词，要具体有记忆点
- funFacts必须是数据驱动的，不能泛泛而谈
- 如果用户只有5件以下单品，personaDescription可以适当短一些，但不要编造`
}

// ─── POST /api/style-analysis ───
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
    const body = await request.json()
    const { profile, items } = body as {
      profile: UserProfile
      items: WardrobeItem[]
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "衣橱为空，请先添加单品" }, { status: 400 })
    }

    const userPrompt = buildAnalysisPrompt(profile, items)
    const systemPrompt = buildSystemPrompt()

    console.log(`[style-analysis] analyzing ${items.length} items for ${profile.gender}`)

    const result = await chat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 1200,
    })

    const text = result.message.content || ""
    console.log(`[style-analysis] response ${text.length} chars`)

    // Parse JSON from response (handle markdown wrapping)
    let jsonStr = text.trim()
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "")
    }

    const analysis = JSON.parse(jsonStr)

    return NextResponse.json({
      personaLabel: analysis.personaLabel || "",
      personaDescription: analysis.personaDescription || "",
      styleKeywords: analysis.styleKeywords || [],
      funFacts: analysis.funFacts || [],
      colorPalette: analysis.colorPalette || "",
      silhouettePref: analysis.silhouettePref || "",
    })
  } catch (err: any) {
    console.error("[style-analysis] error:", err)
    return NextResponse.json(
      { error: `分析失败：${err.message?.slice(0, 200) || "未知错误"}` },
      { status: 500 },
    )
  }
}
