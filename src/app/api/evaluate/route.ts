import { NextRequest, NextResponse } from "next/server"
import { chat } from "@/lib/ai"
import { queryRules, getCurrentSeason } from "@/lib/matching-rules"
import { getItemById } from "@/lib/mock-data"

interface OutfitSlot {
  dress: string | null
  top: string | null
  bottom: string | null
  outerwear: string | null
  shoes: string | null
  bag: string | null
  accessories: string[]
}

function describeOutfit(outfit: OutfitSlot): string {
  const parts: string[] = []
  const slots = ["dress", "top", "bottom", "outerwear", "shoes", "bag"] as const
  const labels: Record<string, string> = {
    dress: "连衣裙", top: "上衣", bottom: "下装", outerwear: "外套", shoes: "鞋", bag: "包",
  }

  for (const slot of slots) {
    const id = outfit[slot]
    if (id && typeof id === "string") {
      const item = getItemById(id)
      if (item) {
        parts.push(
          `${labels[slot]}：${item.name} | 颜色:${item.color} | 材质:${item.material || "未知"} | ` +
          `版型:${item.sub_category || "未知"} | 风格:${item.style_tags.join("、")} | 图案:${item.pattern || "无"}`
        )
      }
    }
  }

  if (outfit.accessories.length > 0) {
    const acc = outfit.accessories
      .map((id) => {
        const item = getItemById(id)
        return item ? `${item.name}(风格:${item.style_tags.join("、")})` : null
      })
      .filter(Boolean)
    if (acc.length > 0) parts.push(`配饰：${acc.join("、")}`)
  }

  return parts.join("\n")
}

function buildEvaluatePrompt(outfit: OutfitSlot, scene?: string): string {
  const outfitDesc = describeOutfit(outfit)
  const season = getCurrentSeason()
  const fullScene = scene || "日常"

  const rules = queryRules({ scene: fullScene, topic: "all" })

  return `你是一位毒舌又暖心的时尚搭配评审。请根据以下搭配规则，对这套搭配打分并给出幽默点评。

【当前季节】${season}
【参考场景】${fullScene}

【搭配规则】
${rules}

【当前搭配】
${outfitDesc}

请严格输出以下 JSON 格式（不要输出其他内容）：

{
  "totalScore": 85,
  "dimensions": {
    "style": 22,
    "color": 21,
    "silhouette": 20,
    "occasion": 22
  },
  "comment": "一句幽默风趣的点评，先肯定优点再俏皮指出可改进处，像闺蜜聊天"
}

评分规则：
- 四项各 0-25 分，totalScore 为四项总和
- style（风格匹配）：单品风格标签是否一致/互补，有无风格冲突
- color（色彩协调）：同色系/中性色+亮色/冷暖搭配是否合理
- silhouette（版型平衡）：上下装廓形是否遵循松紧配原则
- occasion（场合适配）：所选品类和风格是否匹配场景
- comment 20-40字，轻松幽默，以肯定为主，适当给俏皮建议`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { outfit, scene } = body as { outfit: OutfitSlot; scene?: string }

    if (!outfit) {
      return NextResponse.json({ error: "缺少搭配数据" }, { status: 400 })
    }

    // 检查是否至少有一件单品
    const hasItem =
      outfit.dress || outfit.top || outfit.bottom ||
      outfit.outerwear || outfit.shoes || outfit.bag ||
      outfit.accessories.length > 0

    if (!hasItem) {
      return NextResponse.json({ error: "请先搭配至少一件单品" }, { status: 400 })
    }

    const prompt = buildEvaluatePrompt(outfit, scene)

    console.log("[evaluate] 开始评价...")
    const { message } = await chat({
      messages: [
        { role: "user", content: prompt },
      ],
      maxTokens: 600,
    })

    // 解析 JSON（可能包裹在 markdown 代码块中）
    let json = message.content.trim()
    const codeBlockMatch = json.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      json = codeBlockMatch[1].trim()
    }

    const review = JSON.parse(json)

    // 校验字段
    if (
      typeof review.totalScore !== "number" ||
      !review.dimensions ||
      typeof review.dimensions.style !== "number" ||
      typeof review.dimensions.color !== "number" ||
      typeof review.dimensions.silhouette !== "number" ||
      typeof review.dimensions.occasion !== "number" ||
      typeof review.comment !== "string"
    ) {
      throw new Error("AI 返回的评价数据格式不正确")
    }

    console.log(`[evaluate] 总分: ${review.totalScore}`)
    return NextResponse.json({
      totalScore: review.totalScore,
      dimensions: [
        { label: "风格匹配", score: review.dimensions.style, icon: "🎨" },
        { label: "色彩协调", score: review.dimensions.color, icon: "🌈" },
        { label: "版型平衡", score: review.dimensions.silhouette, icon: "📐" },
        { label: "场合适配", score: review.dimensions.occasion, icon: "🎯" },
      ],
      comment: review.comment,
    })
  } catch (err) {
    console.error("[evaluate] Error:", err)
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "AI 评价解析失败，请重试", raw: (err as Error).message },
        { status: 502 }
      )
    }
    const message = err instanceof Error ? err.message : "未知错误"
    return NextResponse.json({ error: `评价服务异常: ${message}` }, { status: 500 })
  }
}
