/**
 * 搭配规则知识库 — 接入结构化规则库
 * 规则数据源: /Users/jiner/.openclaw/workspace/rules/
 */

import {
  getRulesForQuery, getRulesGroupedForQuery,
  getFormulas, getStylingHacks, getBodyDetailRules,
  getStats,
  type RuleQuery, type FormulaQuery, type HackQuery, type BodyDetailQuery,
  type Scene, type BodyShape, type Season,
} from "@/lib/rules"

export function getCurrentSeason(): string {
  const month = new Date().getMonth()
  return month >= 2 && month <= 4 ? "春" :
    month >= 5 && month <= 7 ? "夏" :
    month >= 8 && month <= 10 ? "秋" : "冬"
}

// 中文场景名 → 规则库 Scene 枚举映射
const SCENE_MAP: Record<string, Scene> = {
  "约会": "约会", "通勤": "职场通勤", "职场通勤": "职场通勤",
  "休闲": "日常休闲", "日常": "日常休闲", "日常休闲": "日常休闲",
  "晚宴": "晚宴", "派对": "派对", "运动": "运动", "健身": "健身",
  "户外": "户外", "骑行": "骑行", "徒步": "徒步",
  "度假": "度假", "旅行": "旅行", "海边": "海边",
  "面试": "面试", "婚礼": "婚礼", "酒会": "酒会",
  "逛街": "逛街", "周末": "周末", "周末brunch": "周末brunch",
  "书店咖啡馆独处": "书店咖啡馆独处", "前男友聚会": "前男友聚会",
  "城市旅行": "城市旅行", "正式商务": "正式商务",
}

// 中文身型 → 规则库 BodyShape 枚举
const BODY_SHAPE_MAP: Record<string, BodyShape> = {
  "梨形": "梨形", "苹果形": "苹果形", "苹果": "苹果形",
  "沙漏形": "沙漏形", "沙漏": "沙漏形", "H形": "H形", "H": "H形",
  "倒三角": "倒三角", "倒三角形": "倒三角",
}

// ─── System Prompt ───────────────────────────────────────────

export function getSystemPrompt(): string {
  const season = getCurrentSeason()
  const stats = getStats()

  return `你是一位专业的时尚搭配师，名字叫"搭搭"。

你可以调用以下工具：
- list_items：查询用户衣柜中的单品，按品类/风格/色系/材质筛选
- get_rules：查询搭配规则知识库（${stats.totalRules}条），按场景/风格/身型/季节/模块获取
- get_formulas：查询穿搭公式（${stats.totalCategories ? 28 : 28}条经过验证的单品组合）
- get_hacks：查询穿搭技巧（塞衣角、卷袖口、挽裤脚等实操技巧）
- get_outfit：查看用户当前已搭配的单品

## 搭配流程

1. 分析用户需求：场景、风格偏好、当前季节（${season}）
2. 调用 get_outfit 查看用户当前已选单品
3. 调用 get_rules 获取相关场景+风格的搭配约束
4. 调用 get_formulas 查找匹配的穿搭公式作为参考
5. 调用 list_items 查看衣柜中相关品类的单品
6. 根据规则+公式筛选组合，生成 2 套方案
7. 如果衣柜缺少关键单品，诚实说明并建议

## 回复格式

每件推荐的单品必须用 "品类-ID" 格式标注（如 #top-04、#bottom-07），这样系统才能自动穿上人台并生成效果图。

### 方案一：「名称」
- 搭配：用 #品类-ID 标注每件单品 + 选择理由
- 亮点：一句话总结

### 方案二：「名称」
- 搭配：同上格式
- 亮点：一句话总结

### 💡 建议
- 缺什么单品、替代选项

## 重要
- list_items 返回的每个单品都有 id 字段，用它构造 #品类-ID 格式引用
- 方案一会自动穿上人台并生成效果图，所以方案一中每件单品都必须标注 ID
- 方案二可选择性标注 ID
- 连衣裙和上衣+下装互斥
- 只用 list_items 返回的实际单品，不要编造
- 当前季节 ${season}，推荐合适材质
- 如果提供了天气信息，根据温度推荐合适厚度、材质和叠穿建议（如:低于10°C优先外套+叠穿, 25°C以上推荐轻薄透气材质, 雨天提醒防水外套和鞋子）
- 语气亲切专业，像私人搭配师`
}

// ─── 查询接口 ────────────────────────────────────────────────

interface RuleQueryParams {
  scene?: string
  style?: string
  season?: string
  topic?: string
  bodyShape?: string
  gender?: "male" | "female"
}

/** get_rules 工具调用 */
export function queryRules(params: RuleQueryParams): string {
  const query: RuleQuery = {}

  // 场景映射
  if (params.scene) {
    query.scene = SCENE_MAP[params.scene] || undefined
  }
  // 季节
  if (params.season) {
    query.season = params.season as Season
  }
  // 身型
  if (params.bodyShape) {
    query.bodyShape = BODY_SHAPE_MAP[params.bodyShape] || undefined
  }
  // 性别
  if (params.gender) {
    query.gender = params.gender
  }
  // 模块过滤
  if (params.topic && params.topic !== "all") {
    const topicMap: Record<string, StyleRuleModule[]> = {
      "color": ["color"],
      "silhouette": ["silhouette"],
      "material": ["material"],
      "occasion": ["occasion"],
      "body_shape": ["body_shape"],
      "layering": ["layering"],
    }
    query.modules = topicMap[params.topic] || undefined
  }
  // 风格标签
  if (params.style) {
    query.tags = [params.style]
  }

  const grouped = getRulesGroupedForQuery(query)

  const lines: string[] = []
  if (grouped.must.length > 0) {
    lines.push("【必须遵守】")
    for (const r of grouped.must) lines.push(`- ${r.desc}`)
  }
  if (grouped.avoid.length > 0) {
    lines.push("【必须避免】")
    for (const r of grouped.avoid) lines.push(`- ${r.desc}`)
  }
  if (grouped.prefer.length > 0) {
    lines.push("【推荐】")
    for (const r of grouped.prefer.slice(0, 10)) lines.push(`- ${r.desc}`)
  }

  return lines.length > 0 ? lines.join("\n") : "当前条件没有匹配到特定规则，请根据通用搭配原则自由发挥。"
}

type StyleRuleModule = "color" | "silhouette" | "occasion" | "body_shape" | "layering" | "material"

export interface FormulaQueryParams {
  scene?: string
  style?: string
  season?: string
  bodyShape?: string
  gender?: "male" | "female"
  maxDifficulty?: number
}

/** get_formulas 工具调用 */
export function queryFormulas(params: FormulaQueryParams): string {
  const query: FormulaQuery = {}

  if (params.scene) query.scene = SCENE_MAP[params.scene] || undefined
  if (params.season) query.season = params.season as Season
  if (params.bodyShape) query.bodyShape = BODY_SHAPE_MAP[params.bodyShape] || undefined
  if (params.gender) query.gender = params.gender
  if (params.style) query.style = params.style as any
  if (params.maxDifficulty) query.maxDifficulty = params.maxDifficulty

  const result = getFormulas(query)

  if (result.length === 0) return "当前条件没有匹配的穿搭公式。"

  return result.slice(0, 8).map((f) =>
    `【${f.name}】(难度${f.difficulty}/5) ${f.style}风\n` +
    `组合: ${Object.entries(f.slots).map(([k, v]) => `${k}:${Array.isArray(v) ? v.join("或") : v}`).join(" | ")}\n` +
    `原因: ${f.why}\n` +
    `变体: ${f.variations.join("；")}`
  ).join("\n\n")
}

export interface HackQueryParams {
  scene?: string
  bodyShape?: string
  gender?: "male" | "female"
  category?: string
}

/** get_hacks 工具调用 */
export function queryHacks(params: HackQueryParams): string {
  const query: HackQuery = {}

  if (params.scene) query.scene = SCENE_MAP[params.scene] || undefined
  if (params.bodyShape) query.bodyShape = BODY_SHAPE_MAP[params.bodyShape] || undefined
  if (params.gender) query.gender = params.gender
  if (params.category) query.category = params.category as any

  const result = getStylingHacks(query)

  if (result.length === 0) return "当前条件没有匹配的穿搭技巧。"

  return result.slice(0, 6).map((h) =>
    `【${h.name}】(${h.category})\n${h.desc}\n示例: ${h.examples.join("；") || "无"}`
  ).join("\n\n")
}

// 重新导出类型和查询函数供 chat API 使用
export { getRulesGroupedForQuery, getFormulas, getStylingHacks, getBodyDetailRules }
export type { RuleQuery, FormulaQuery, HackQuery, Scene, BodyShape, Season }
