/**
 * 造型师"搭搭"进场问候文案 — 纯模板，无 LLM 调用。
 * remark = 天气事实（插入今天真实 temp/condition）+ 场景化建议，按 场景 × 天气类别 组合。
 * 无天气时降级为纯场景句；未知场景走 __default 兜底。
 */

export interface RemarkWeather {
  temp: number // 摄氏度
  condition: string // 天气状况文案（晴/多云/小雨/雾…）
}

type WeatherCat = "rain" | "snow" | "haze" | "hot" | "cold" | "cool" | "nice"

function weatherCat({ temp, condition }: RemarkWeather): WeatherCat {
  if (/雨/.test(condition)) return "rain"
  if (/雪/.test(condition)) return "snow"
  if (/雾|霾|沙|尘/.test(condition)) return "haze"
  if (temp >= 30) return "hot"
  if (temp <= 8) return "cold"
  if (temp <= 16) return "cool"
  return "nice"
}

// 天气事实短句：每条都引用今天真实数值/状况，"懂今天"的爽点全在这里
const LEAD: Record<WeatherCat, (w: RemarkWeather) => string> = {
  hot: (w) => `今天${w.temp}°C 有点热`,
  cold: (w) => `今天${w.temp}°C 挺冷`,
  cool: (w) => `今天${w.temp}°C 微凉`,
  nice: (w) => `今天${w.condition} ${w.temp}°C`,
  rain: (w) => `今天有${w.condition}`,
  snow: (w) => `今天${w.condition}`,
  haze: (w) => `今天${w.condition}`,
}

type SceneTips = { base: string[] } & Partial<Record<WeatherCat, string[]>>

const SCENE_TIPS: Record<string, SceneTips> = {
  "周末 brunch": {
    base: ["松弛感穿搭，今天慢慢享受就好", "选舒适又上镜的，brunch 拍照才好看"],
    hot: ["透气棉麻 + 草编包，清爽又度假"],
    cold: ["加件针织开衫，暖和又有氛围"],
    cool: ["薄风衣刚好，微凉天最显气质"],
    rain: ["带把好看的伞，雨天 brunch 也精致"],
  },
  "三天海边旅行": {
    base: ["度假感拉满，颜色可以大胆一点", "选透气防晒的，玩得尽兴最重要"],
    hot: ["防晒帽 + 棉麻 + 墨镜，别晒伤"],
    cold: ["海风凉，备一件防风外套"],
    cool: ["晚风偏凉，带条披肩刚刚好"],
    rain: ["换双防滑鞋，雨天海边更要稳"],
  },
  "第一次约会": {
    base: ["今天放轻松，做自己最迷人", "穿你最有把握的那套，气场就对了"],
    hot: ["清爽透气更自在，别被热打乱节奏"],
    cold: ["大衣 + 暖色，保暖又有心动感"],
    cool: ["微凉天，叠穿一件更有层次"],
    rain: ["带把伞，雨天约会反而更有氛围"],
  },
  "书店咖啡馆独处": {
    base: ["舒适优先，享受独处的安静时光", "大地色 + 帆布袋，文艺感刚刚好"],
    hot: ["室内空调凉，备件薄外套别着凉"],
    cold: ["针织 + 围巾，暖暖地窝一下午"],
    cool: ["微凉天，叠件开衫最惬意"],
    rain: ["雨天最适合泡书店，慢慢翻就好"],
  },
  "重要汇报日": {
    base: ["今天稳住气场，你准备得很充分", "利落剪裁 + 低饱和，专业感拉满"],
    hot: ["透气西装面料，热天也要清爽得体"],
    cold: ["大衣 + 内搭，保暖也不失利落"],
    cool: ["加件西装外套，微凉天更显挺括"],
    rain: ["带伞备份，别让雨打乱你的节奏"],
  },
  "一个人看展": {
    base: ["极简留白感穿搭，和展品互不抢戏", "黑白灰 + 一个亮点，安静又有态度"],
    hot: ["轻薄透气，逛一下午也不闷"],
    cold: ["简约大衣，冷天也要利落线条"],
    cool: ["叠穿一件薄外套，微凉刚好"],
    rain: ["雨天看展正好清净，带把素色伞"],
  },
  "前任会出现的聚会": {
    base: ["今晚为自己而穿，状态就是答案", "选最有气场的那套，自信最好看"],
    hot: ["清爽又利落，热天也要稳住气场"],
    cold: ["大衣裹住气场，冷天更显从容"],
    cool: ["叠穿显层次，微凉天气场更足"],
    rain: ["带把伞，雨夜出场也要体面"],
  },
  __default: {
    base: ["今天也要好好穿，状态在线", "选你喜欢又自在的那套就对了"],
    hot: ["透气清爽，热天也舒服"],
    cold: ["注意保暖，叠穿更有层次"],
    cool: ["微凉天，加件外套刚好"],
    rain: ["记得带伞，雨天也精致"],
  },
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function pickRemark(sceneName: string | null | undefined, weather?: RemarkWeather | null): string {
  const tips = (sceneName && SCENE_TIPS[sceneName]) || SCENE_TIPS.__default
  if (!weather || Number.isNaN(weather.temp)) {
    return pick(tips.base)
  }
  const cat = weatherCat(weather)
  const tip = pick(tips[cat] ?? tips.base)
  return `${LEAD[cat](weather)}，${tip}`
}
