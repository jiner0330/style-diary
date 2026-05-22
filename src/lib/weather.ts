/**
 * 和风天气 API — 实时天气 + 3日预报
 * 免费版: https://devapi.qweather.com
 * 城市查询: https://geoapi.qweather.com
 */

const QWEATHER_KEY = process.env.QWEATHER_API_KEY!
const WEATHER_BASE = "https://devapi.qweather.com/v7/weather"
const GEO_BASE = "https://geoapi.qweather.com/v2/city"

export interface CurrentWeather {
  temp: string        // 温度 °C
  feelsLike: string   // 体感温度
  text: string        // 天气状况（晴、多云、雨等）
  icon: string        // 图标代码
  windDir: string     // 风向
  windScale: string   // 风力等级
  humidity: string    // 湿度 %
  precip: string      // 降水量 mm
  vis: string         // 能见度 km
}

export interface DayForecast {
  date: string
  tempMax: string
  tempMin: string
  textDay: string     // 白天天气
  textNight: string   // 夜间天气
  windDirDay: string
  windScaleDay: string
  humidity: string
  precip: string
}

export interface WeatherData {
  city: string
  current: CurrentWeather
  forecast: DayForecast[]
}

const WEATHER_ICON_MAP: Record<string, string> = {
  "100": "晴", "101": "多云", "102": "少云", "103": "晴间多云",
  "104": "阴",
  "300": "阵雨", "301": "强阵雨",
  "302": "雷阵雨", "303": "强雷阵雨", "304": "雷阵雨伴有冰雹",
  "305": "小雨", "306": "中雨", "307": "大雨", "308": "极地",
  "309": "毛毛雨", "310": "暴雨", "311": "大暴雨", "312": "特大暴雨",
  "313": "冻雨",
  "400": "小雪", "401": "中雪", "402": "大雪", "403": "暴雪",
  "404": "雨夹雪", "405": "雨雪天气", "406": "阵雨夹雪", "407": "阵雪",
  "500": "薄雾", "501": "雾", "502": "霾", "503": "扬沙",
  "504": "浮尘", "507": "沙尘暴", "508": "强沙尘暴",
}

export function weatherSummary(data: WeatherData): string {
  const c = data.current
  const today = data.forecast[0]
  const iconText = WEATHER_ICON_MAP[c.icon] || c.text

  let summary = `${data.city}当前${iconText}，${c.temp}°C（体感${c.feelsLike}°C），`
  summary += `${c.windDir}${c.windScale}级，湿度${c.humidity}%`

  if (today) {
    summary += `。今日${today.textDay}，${today.tempMin}°C ~ ${today.tempMax}°C`
    if (data.forecast[1]) {
      const tmr = data.forecast[1]
      summary += `；明日${tmr.textDay}，${tmr.tempMin}°C ~ ${tmr.tempMax}°C`
    }
  }

  return summary
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  if (!QWEATHER_KEY) {
    console.warn("[weather] QWEATHER_API_KEY not set")
    return null
  }

  const location = `${lon.toFixed(2)},${lat.toFixed(2)}`

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)

    // 并发：城市信息 + 当前天气 + 3日预报
    const [cityRes, nowRes, forecastRes] = await Promise.all([
      fetch(`${GEO_BASE}/lookup?location=${location}&key=${QWEATHER_KEY}`, { signal: ctrl.signal }),
      fetch(`${WEATHER_BASE}/now?location=${location}&key=${QWEATHER_KEY}`, { signal: ctrl.signal }),
      fetch(`${WEATHER_BASE}/3d?location=${location}&key=${QWEATHER_KEY}`, { signal: ctrl.signal }),
    ])

    clearTimeout(t)

    if (!nowRes.ok) {
      console.error("[weather] API error:", nowRes.status)
      return null
    }

    const cityData = await cityRes.json().catch(() => ({}))
    const nowData = await nowRes.json()
    const forecastData = await forecastRes.json().catch(() => ({}))

    if (nowData.code !== "200") {
      console.error("[weather] API code:", nowData.code)
      return null
    }

    const city = cityData?.location?.[0]?.name || "未知城市"
    const now = nowData.now

    const current: CurrentWeather = {
      temp: now.temp,
      feelsLike: now.feelsLike,
      text: now.text,
      icon: now.icon,
      windDir: now.windDir,
      windScale: now.windScale,
      humidity: now.humidity,
      precip: now.precip,
      vis: now.vis,
    }

    const forecast: DayForecast[] = (forecastData.daily || []).map((d: any) => ({
      date: d.fxDate,
      tempMax: d.tempMax,
      tempMin: d.tempMin,
      textDay: d.textDay,
      textNight: d.textNight,
      windDirDay: d.windDirDay,
      windScaleDay: d.windScaleDay,
      humidity: d.humidity,
      precip: d.precip,
    }))

    return { city, current, forecast }
  } catch (err) {
    console.error("[weather] fetch error:", err)
    return null
  }
}
