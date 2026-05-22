import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
})

const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

function buildSystemPrompt(gender: 'female' | 'male') {
  const userDesc = gender === 'female' ? '女生' : '男生'
  const buddyRole = gender === 'female' ? '懂穿搭的闺蜜' : '有品位的兄弟'

  return `你是「搭搭」，一个 AI 造型师。你的用户是 20-35 岁的${userDesc}。

## 你的性格
- 像${buddyRole}，不是时尚杂志编辑
- 专业但不卖弄术语，温柔但有主见
- 偶尔有一点幽默感，但不说教
- 能读懂场景背后的情绪（紧张、期待、释然……）

## 你的专业
${
  gender === 'female'
    ? `- 女装版型建议：梨形→A字裙/阔腿裤、苹果型→V领/帝国腰线、H型→收腰设计、沙漏型→突出腰线、倒三角→弱化肩部
- 避开雷区：梨形不推荐包臀裙，苹果型不推荐紧身上衣，倒三角不推荐垫肩`
    : `- 男装版型建议：矩型→增加肩部量感、倒三角→突出身材优势、椭圆型→垂直线条拉长、梯形→合身剪裁、瘦长型→增加层次感
- 避开雷区：椭圆型不推荐横条纹和紧身款，瘦长型不推荐过于宽松，梯形不推荐 oversized`
}
- 懂得色彩搭配原理（冷暖、对比、呼应）
- 了解不同场合的着装规则
- 尊重用户的个人风格偏好

## 输出要求
返回纯 JSON，不要 markdown 代码块包裹，不要任何额外的解释文字。`
}

export async function getXiaocaiRecommendations(params: {
  gender: 'female' | 'male'
  sceneName: string
  sceneStoryText: string
  userBodyData: Record<string, string>
  userStyleTags: string[]
  wardrobeItems: Array<{
    id: string
    name: string
    category: string
    color: string
    styleTags: string[]
  }>
}) {
  const userMessage = `场景：${params.sceneName}
场景描述：${params.sceneStoryText}

用户性别：${params.gender === 'female' ? '女' : '男'}
用户体型数据：${JSON.stringify(params.userBodyData)}
用户风格偏好：${params.userStyleTags.join('、')}

系统单品库：
${JSON.stringify(params.wardrobeItems)}

请为这个场景推荐 3 套完整搭配方案。

返回格式：
{
  "recommendations": [
    {
      "name": "风格名",
      "items": [{"itemId": "单品id", "reason": "为什么选这件，结合体型和性别分析"}],
      "overallReason": "整体推荐理由，80-120字，结合体型、性别和场景"
    }
  ]
}

要求：
- 3 个方案风格要有明显差异
- 每套 4-7 件单品
- 推荐理由要结合用户的具体体型和性别做分析，不要泛泛而谈
- 避开用户体型的雷区`

  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: buildSystemPrompt(params.gender) },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
  })

  const text = response.choices[0]?.message?.content || ''
  return JSON.parse(text)
}

export async function getXiaocaiReview(params: {
  gender: 'female' | 'male'
  sceneName: string
  userBodyData: Record<string, string>
  outfitItems: Array<{
    name: string
    category: string
    color: string
    styleTags: string[]
  }>
}) {
  const userMessage = `场景：${params.sceneName}
用户性别：${params.gender === 'female' ? '女' : '男'}
用户体型数据：${JSON.stringify(params.userBodyData)}

当前搭配：
${params.outfitItems.map(i => `- ${i.category}: ${i.name}（${i.color}，风格：${i.styleTags.join('/')}）`).join('\n')}

请点评这套搭配。

返回格式：
{
  "review": "整体点评，100-150字，像一个懂穿搭的朋友在说话",
  "highlights": ["亮点1", "亮点2"],
  "suggestions": ["改进建议1", "改进建议2"],
  "expression": "happy|thinking|clap|wink|frown"
}`

  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: buildSystemPrompt(params.gender) },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
  })

  const text = response.choices[0]?.message?.content || ''
  return JSON.parse(text)
}
