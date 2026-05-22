import { NextRequest, NextResponse } from "next/server"
import { fetchWeather, weatherSummary } from "@/lib/weather"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get("lat") || "")
  const lon = parseFloat(searchParams.get("lon") || "")

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "缺少 lat/lon 参数" }, { status: 400 })
  }

  try {
    const data = await fetchWeather(lat, lon)
    if (!data) {
      return NextResponse.json({ error: "天气数据获取失败" }, { status: 502 })
    }

    return NextResponse.json({
      ...data,
      summary: weatherSummary(data),
    })
  } catch (err) {
    console.error("[weather-api] error:", err)
    return NextResponse.json({ error: "天气服务异常" }, { status: 500 })
  }
}
