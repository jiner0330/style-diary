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
} from "@/lib/style-rules"

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

interface UserProfile {
  gender?: "female" | "male"
  bodyType?: string | null
  styleTags?: string[]
  weatherSummary?: string | null
}

export function extractOutfitCount(message: string): number {
  const digitMap: Record<string, number> = {
    "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
  }
  const patterns = [
    /(\d+)\s*(?:套|个?(?:方案|搭配|组合))/,
    /([一二三四五六七八九十])\s*(?:套|个?(?:方案|搭配|组合))/,
  ]
  for (const p of patterns) {
    const m = message.match(p)
    if (m) {
      const n = digitMap[m[1]] ?? parseInt(m[1], 10)
      if (n >= 1 && n <= 10) return n
    }
  }
  return 2
}

export function getSystemPrompt(profile?: UserProfile, count: number = 2): string {
  const season = getCurrentSeason()
  const stats = getStats()

  // 用户画像段落
  let profileSection = ""
  let weatherSection = ""
  if (profile) {
    const parts: string[] = []
    if (profile.gender) parts.push(`性别：${profile.gender === "female" ? "女" : "男"}`)
    if (profile.bodyType) parts.push(`身型：${profile.bodyType}`)
    if (profile.styleTags && profile.styleTags.length > 0) parts.push(`风格偏好：${profile.styleTags.join("、")}`)
    if (parts.length > 0) {
      profileSection = `\n## 用户画像\n${parts.join(" | ")}\n`
    }
    if (profile.weatherSummary) {
      weatherSection = `\n## 当前天气\n${profile.weatherSummary}\n`
    }
  }

  return `你是一位专业的时尚搭配师，名字叫"搭搭"。${profileSection}${weatherSection}

你可以调用以下工具：
- list_items：查询衣柜中的单品，按品类/风格/色系/材质筛选
- get_rules：查询搭配规则知识库（${stats.totalRules}条），按场景/风格/身型/季节/模块获取
- get_formulas：查询穿搭公式（28条经过验证的单品组合）

## 搭配流程

1. 分析用户需求：场景、风格偏好、当前季节（${season}）${profile?.weatherSummary ? "。天气数据已提供（见上方），直接使用，无需额外查询" : ""}。用户的身型和性别已知（见上方用户画像），无需推断。如果对话开头有"用户搭配面板参考"信息，说明用户当前搭配面板中有这些单品，仅供参考——根据用户的实际提问自行判断是否围绕这些单品做搭配，不要预设用户意图
2. **第一轮同时调用** get_rules + get_formulas（所有相关品类一次性并发调用），get_rules 和 get_formulas 必须传入用户画像中的身型和性别。**如果对话开头有"用户已指定搭配单品"，说明用户勾选了单品——必须围绕这些单品搭配（最高优先级），可建议补充 1-2 件，严禁抛弃它们自由发挥**；如果用户没勾选单品，才调 list_items 查询衣橱、引导先勾选
3. **第二轮直接输出恰好 ${count} 套文字方案**，不要继续调工具。**优先基于用户勾选的单品搭配**，建议补充的单品要明确标注（哪些是用户已有的、哪些是建议补充的）
4. 每套方案自带预估评分（0-100）
5. 必须恰好输出 ${count} 套方案，每套方案各一个 JSON code block。开头用"为你搭配了 ${count} 套方案"

## 输出格式

每套方案必须输出一个 JSON code block，包含完整单品属性：

\`\`\`json
{
  "plan": 1,
  "name": "方案名称",
  "score": 88,
  "reason": "搭配理由，说明如何满足场景需求和身型修饰",
  "items": [
    {
      "slot": "top",
      "name": "单品中文描述名",
      "category": "top",
      "sub_category": "shirt",
      "color": "#FAF7F4",
      "material": "真丝",
      "pattern": "纯色",
      "fit": "合身",
      "length": "常规",
      "neckline": "翻领",
      "detail": "翻领设计，纽扣门襟",
      "style_tags": ["简约", "通勤"]
    }
  ]
}
\`\`\`

### JSON 字段约束

- **slot**: dress | top | bottom | outerwear | shoes | bag | accessories
- **category**: top | bottom | dress | outerwear | shoes | bag | accessory
- **sub_category** 必须从以下枚举中选择：
  - top: sweater | shirt | blouse | cardigan | hoodie | henley | turtleneck | off_shoulder_corset | halter | off_shoulder_ls | puff_sleeve | off_shoulder_tee | sweatshirt | tank
  - bottom: jeans | trousers | skirt | shorts | cargo | chinos | wide_jeans | mermaid_skirt | pencil_skirt
  - dress: mini | midi | maxi | off_shoulder_dress
  - outerwear: blazer | jacket | trench | bomber
  - shoes: sneakers | heels | boots | loafers
  - bag: tote | shoulder
  - accessory: necklace | earrings | scarf | sunglasses | belt | watch
- **color**: hex 颜色值，必须从下表中选取与单品名称匹配的 hex：
  - 白色/米白/奶白: #FAF7F4 | 黑色: #2A2A2A | 深灰: #5C5C5C | 灰色: #9A9A9A
  - 浅蓝: #A8C4D4 | 深蓝/藏青: #1A2A4A | 蓝色: #6B8FA3 | 牛仔蓝: #7B9CB5
  - 酒红: #8B2252 | 粉色: #E8B4B8 | 裸粉/豆沙粉: #C4A8A3 | 裸粉/灰粉: #D4C5C2
  - 卡其/米色/驼色/燕麦: #D4C5A0 | 棕色: #5C3A2A
  - 黄色/鹅黄: #E8D8A0 | 姜黄: #DDA040 | 浅黄: #F5F0D0
  - 绿色/墨绿: #3A5A3A | 军绿: #B4C1A8 | 灰绿: #B5C1B4 | 亮绿: #88C8A0 | 翠绿: #50B878 | 薄荷绿: #98D8B8 | 浅绿/清新绿: #C1D8C3
  - 紫色: #D4A5A5 | 橙色: #DDA040
- **fit**: 紧身 | 修身 | 合身 | 宽松 | oversized
- **length**: 短款 | 常规 | 中长 | 长款
- **neckline**: 圆领 | V领 | 方领 | 高领 | 翻领 | 一字肩 | 吊带 | 无领
- **pattern**: 纯色 | 格纹 | 条纹 | 碎花 | 波点 | 豹纹 | 千鸟格 | 拼接 | 扎染 | 迷彩 | 老花。默认纯色，仅在用户明确指定时使用其他图案
- **name**: 仅描述品类、版型、颜色，**禁止**包含图案描述（格纹、条纹、印花等），图案通过 pattern 字段表达
- **style_tags**: 1-3 个风格标签
- **color 必须与 name 中的颜色描述一致**：name 写"裸粉"则 color 必须是 #D4C5C2 或 #C4A8A3，name 写"白色/米白/奶油白"则 color 必须是 #FAF7F4

### 输出示例（仅格式参考，实际数量以用户要求和上方 count 为准）

为你搭配了 ${count} 套方案：

（以下为单个方案的 JSON 格式示例，共需输出 ${count} 个）

### 方案一：[方案名]（预估 XX 分）

搭配理由：[说明如何满足场景需求和身型修饰]

（JSON block）

（... 重复以上格式，输出恰好 ${count} 个方案，每个方案一个 JSON code block）

## 重要规则

- **优先基于用户勾选的单品**：如果对话开头有"用户已指定搭配单品"，必须围绕这些单品搭配，可建议补充但严禁抛弃；建议补充的单品要标清（用户已有 vs 建议补充）
- **连衣裙和上衣+下装互斥**，不能同时出现
- 当前季节 ${season}，推荐合适材质和厚度
- get_rules 返回的【必须避免】是硬约束
- 子品类 sub_category 必须准确，它直接影响后续生图精度
- **color 必须与 name 中的颜色描述一致**，严禁颜色名和 hex 不匹配
- **pattern 默认纯色**：用户没有明确要求图案时，所有单品的 pattern 字段必须填 "纯色"，严禁擅自给下装/上衣加格纹、条纹等图案
- **方案数量由用户决定**：输出恰好 ${count} 套方案，即使示例只展示了格式，也不代表固定数量。如果用户要求 3 套就是 3 套，要求 5 套就是 5 套，不得擅自增减
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

  let grouped = getRulesGroupedForQuery(query)

  // 风格标签过滤导致规则为空时，回退到不过滤标签
  if (grouped.all.length === 0 && query.tags && query.tags.length > 0) {
    const { tags: _t, ...queryWithoutTags } = query
    grouped = getRulesGroupedForQuery(queryWithoutTags)
  }

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

  let result = getFormulas(query)

  // 风格过滤导致空结果时回退到不过滤风格
  if (result.length === 0 && query.style) {
    const { style: _s, ...queryWithoutStyle } = query
    result = getFormulas(queryWithoutStyle)
  }

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
