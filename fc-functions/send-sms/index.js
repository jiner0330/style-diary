const http = require("http")
const Client = require("@alicloud/dypnsapi20170525").default
const { SendSmsVerifyCodeRequest } = require("@alicloud/dypnsapi20170525")
const { Config } = require("@alicloud/openapi-core/dist/utils")

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

function getClient() {
  const config = new Config({
    accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET,
  })
  config.endpoint = "dypnsapi.aliyuncs.com"
  config.timeout = 15000
  config.readTimeout = 15000
  return new Client(config)
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
    const { phone } = await parseBody(req)
    if (!phone) return json(res, 400, { error: "请输入手机号" })

    const digits = phone.replace(/\D/g, "")
    if (digits.length < 8 || digits.length > 15) {
      return json(res, 400, { error: "手机号格式不正确" })
    }

    const client = getClient()
    const { phoneNumber, countryCode } = parsePhone(phone)

    const reqObj = new SendSmsVerifyCodeRequest({
      phoneNumber,
      countryCode,
      signName: process.env.ALIBABA_SMS_SIGN_NAME,
      templateCode: process.env.ALIBABA_SMS_TEMPLATE_CODE,
      templateParam: JSON.stringify({ code: "##code##", min: "5" }),
      codeLength: 6,
      codeType: 1,
      validTime: 300,
      interval: 60,
    })

    const smsRes = await client.sendSmsVerifyCodeWithOptions(reqObj, { ignoreSSL: true })
    console.log("[send-sms] OK:", phoneNumber)

    if (smsRes.body?.code !== "OK") {
      return json(res, 500, { error: `[${smsRes.body?.code}] ${smsRes.body?.message || "短信发送失败"}` })
    }

    json(res, 200, { ok: true })
  } catch (err) {
    console.error("[send-sms]", err)
    json(res, 500, { error: `发送失败：${err.message}` })
  }
})

const port = process.env.FC_SERVER_PORT || 9000
server.listen(port, () => {
  console.log(`[send-sms] listening on ${port}`)
})
