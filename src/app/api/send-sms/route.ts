import { NextRequest, NextResponse } from "next/server"
import { sendVerificationCode } from "@/lib/sms"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone) {
      return NextResponse.json({ error: "请输入手机号" }, { status: 400 })
    }
    const digits = phone.replace(/\D/g, "")
    if (digits.length < 8 || digits.length > 15) {
      return NextResponse.json({ error: "手机号格式不正确" }, { status: 400 })
    }

    // Rate limit per phone: 1 request per 60s
    const phoneLimit = rateLimit(`sms:phone:${phone}`, { windowMs: 60_000, maxRequests: 1 })
    if (!phoneLimit.allowed) {
      return NextResponse.json({ error: "发送过于频繁，请60秒后再试" }, { status: 429 })
    }

    // Rate limit per IP: 5 requests per hour
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    const ipLimit = rateLimit(`sms:ip:${ip}`, { windowMs: 3600_000, maxRequests: 5 })
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 })
    }

    await sendVerificationCode(phone)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[send-sms]", err)
    return NextResponse.json({ error: "发送失败，请稍后重试" }, { status: 500 })
  }
}
