const http = require("http")
const crypto = require("crypto")
const Client = require("@alicloud/dypnsapi20170525").default
const { SendSmsVerifyCodeRequest, CheckSmsVerifyCodeRequest } = require("@alicloud/dypnsapi20170525")
const { Config } = require("@alicloud/openapi-core/dist/utils")
const { createClient } = require("@supabase/supabase-js")

const SUPA_URL = "https://vklltmfmttuaahqmwksu.supabase.co"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

function getSMSClient() {
  const config = new Config({
    accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET,
  })
  config.endpoint = "dypnsapi.aliyuncs.com"
  config.timeout = 15000
  config.readTimeout = 15000
  return new Client(config)
}

function getAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")
  return createClient(SUPA_URL, key)
}

function getPhoneSecret() {
  const secret = process.env.PHONE_USER_SECRET
  if (!secret) throw new Error("PHONE_USER_SECRET not configured")
  return secret
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = ""
    req.on("data", (chunk) => { body += chunk.toString() })
    req.on("end", () => {
      try { resolve(JSON.parse(body)) } catch { resolve({}) }
    })
  })
}

function parsePhone(raw) {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("86") && digits.length === 13) {
    return { phoneNumber: digits.slice(2), countryCode: "86" }
  }
  return { phoneNumber: digits, countryCode: "86" }
}

function phoneToEmail(phone) {
  const clean = phone.replace(/\D/g, "")
  return `p${clean}@phone.style-diary.internal`
}

function json(res, status, data) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(data))
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))
    res.statusCode = 204
    res.end()
    return
  }

  try {
    const { phone, code } = await parseBody(req)
    if (!phone || !code) return json(res, 400, { error: "手机号和验证码不能为空" })

    const digits = phone.replace(/\D/g, "")
    if (digits.length < 8 || digits.length > 15) return json(res, 400, { error: "手机号格式不正确" })
    if (!/^\d{4,8}$/.test(code)) return json(res, 400, { error: "验证码格式不正确" })

    // 1. 校验阿里云短信验证码
    const smsClient = getSMSClient()
    const { phoneNumber, countryCode } = parsePhone(phone)

    const checkReq = new CheckSmsVerifyCodeRequest({
      phoneNumber,
      countryCode,
      verifyCode: code,
    })
    const checkRes = await smsClient.checkSmsVerifyCodeWithOptions(checkReq, { ignoreSSL: true })
    console.log("[verify-sms] check:", JSON.stringify({ code: checkRes.body?.code }))

    if (checkRes.body?.code !== "OK") {
      return json(res, 500, { error: `验证码校验失败：${checkRes.body?.message}` })
    }

    // 2. 创建或更新 Supabase 用户（阿里云 FC 上海 → Supabase 上海，同城直连）
    const supabaseAdmin = getAdminClient()
    const email = phoneToEmail(phone)
    const password = crypto.createHmac("sha256", getPhoneSecret())
      .update(`phone:${digits}`)
      .digest("hex")
      .slice(0, 32)

    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { phone },
    })

    if (createErr) {
      if (createErr.message?.includes("already") || createErr.status === 422) {
        console.log("[verify-sms] user already exists, updating password")
        // 强制更新密码：消除 PHONE_USER_SECRET 变更或跨环境不一致导致的密码不匹配
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const existing = users?.find(u => u.email === email)
        if (existing) {
          const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
            existing.id,
            { password }
          )
          if (updateErr) {
            console.error("[verify-sms] updateUserById failed:", updateErr.message)
          } else {
            console.log("[verify-sms] password updated for existing user")
          }
        }
      } else {
        console.error("[verify-sms] createUser failed:", createErr.message)
      }
    }

    json(res, 200, { email, password })
  } catch (err) {
    console.error("[verify-sms]", err)
    json(res, 500, { error: `验证失败：${err.message}` })
  }
})

const port = process.env.FC_SERVER_PORT || 9000
server.listen(port, () => {
  console.log(`[verify-sms] listening on ${port}`)
})
