import { NextResponse } from "next/server"

const VOLC_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/images/generations"
const API_KEY = process.env.VOLCENGINE_API_KEY || ""

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ ok: false, error: "VOLCENGINE_API_KEY 未配置" })
  }

  const t0 = Date.now()
  try {
    // 用最小请求探测连通性（不带 image 参数，预期返回参数校验错误而非网络错误）
    const res = await fetch(VOLC_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "doubao-seedream-4-0-250828",
        prompt: "test",
        size: "1K",
      }),
      signal: AbortSignal.timeout(15000),
    })

    const latency = Date.now() - t0
    const text = await res.text().catch(() => "")

    // 只要能连上并拿到响应（无论 HTTP 状态码），说明网络通
    return NextResponse.json({
      ok: true,
      latency_ms: latency,
      http_status: res.status,
      body_preview: text.slice(0, 300),
    })
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      latency_ms: Date.now() - t0,
      error: err?.message || String(err),
      cause: err?.cause ? String(err.cause) : undefined,
    })
  }
}
