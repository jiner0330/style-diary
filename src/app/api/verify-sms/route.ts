import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkVerificationCode } from "@/lib/sms"
import { rateLimit } from "@/lib/rate-limit"
import crypto from "crypto"

function getPhoneSecret(): string {
  const secret = process.env.PHONE_USER_SECRET
  if (!secret) throw new Error("PHONE_USER_SECRET environment variable is required")
  return secret
}

function getAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")

  // macOS 开发环境 TLS 兼容（NODE_EXTRA_CA_CERTS 存在时用自定义 fetch）
  if (process.env.NODE_EXTRA_CA_CERTS) {
    const https = require("https") as typeof import("https")
    const http = require("http") as typeof import("http")
    const agent = new https.Agent({ rejectUnauthorized: false })
    const customFetch = (url: string | URL, init?: RequestInit): Promise<Response> => {
      const u = typeof url === "string" ? new URL(url) : url
      const isHttps = u.protocol === "https:"
      const method = init?.method || "GET"
      const headers: Record<string, string> = {}
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((v, k) => { headers[k] = v })
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([k, v]) => { headers[k] = v })
        } else {
          Object.assign(headers, init.headers)
        }
      }
      const mod = isHttps ? https : http
      return new Promise((resolve, reject) => {
        const req = mod.request(url, { method, headers, agent: isHttps ? agent : undefined, rejectUnauthorized: false }, (res: any) => {
          let body = ""
          res.on("data", (chunk: Buffer) => { body += chunk.toString() })
          res.on("end", () => resolve(new Response(body, { status: res.statusCode, statusText: res.statusMessage })))
        })
        req.on("error", reject)
        if (init?.body) req.write(typeof init.body === "string" ? init.body : JSON.stringify(init.body))
        req.end()
      })
    }
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { global: { fetch: customFetch as typeof fetch } })
  }

  // Vercel Linux 用标准 fetch
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

function phoneToEmail(phone: string) {
  const clean = phone.replace(/\D/g, "")
  return `p${clean}@phone.style-diary.internal`
}

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json()
    if (!phone || !code) {
      return NextResponse.json({ error: "手机号和验证码不能为空" }, { status: 400 })
    }
    const digits = phone.replace(/\D/g, "")
    if (digits.length < 8 || digits.length > 15) {
      return NextResponse.json({ error: "手机号格式不正确" }, { status: 400 })
    }
    if (!/^\d{4,8}$/.test(code)) {
      return NextResponse.json({ error: "验证码格式不正确" }, { status: 400 })
    }

    // Rate limit: 5 verification attempts per phone per 5 minutes
    const verifyLimit = rateLimit(`verify:phone:${phone}`, { windowMs: 300_000, maxRequests: 5 })
    if (!verifyLimit.allowed) {
      return NextResponse.json({ error: "验证次数过多，请5分钟后再试" }, { status: 429 })
    }

    // 1. 调用阿里云短信认证 API 校验验证码
    console.log("[verify-sms] checking code for phone:", digits, "code len:", code.length)
    await checkVerificationCode(phone, code)

    // 2. 创建或复用 Supabase 用户
    const supabaseAdmin = getAdminClient()
    const email = phoneToEmail(phone)
    const password = crypto.createHmac("sha256", getPhoneSecret()).update(`phone:${digits}`).digest("hex").slice(0, 32)

    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { phone },
    })

    if (createErr) {
      // 用户已存在 → 正常流程
      if (createErr.message?.includes("already") || createErr.status === 422) {
        console.log("[verify-sms] user already exists, proceeding")
      } else {
        // 其他错误：打印完整信息，但仍返回凭据让前端尝试登录
        // （用户可能在之前某次请求中已创建成功）
        console.error("[verify-sms] createUser failed:", JSON.stringify(createErr))
        console.error("[verify-sms] createUser message:", createErr.message)
        console.error("[verify-sms] createUser status:", createErr.status)
      }
    }

    // 3. 返回登录凭据给前端（无论 createUser 是否成功都返回）
    return NextResponse.json({ email, password })
  } catch (err: any) {
    console.error("[verify-sms] unexpected error:", err)
    return NextResponse.json({ error: `验证失败：${err.message || "未知错误"}` }, { status: 500 })
  }
}
