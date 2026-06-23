const Client = require("@alicloud/dypnsapi20170525")
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

function json(resp, status, data) {
  Object.entries(CORS).forEach(([k, v]) => resp.setHeader(k, v))
  resp.statusCode = status
  resp.setHeader("Content-Type", "application/json")
  resp.end(JSON.stringify(data))
}

exports.handler = async (req, resp) => {
  if (req.method === "OPTIONS") {
    Object.entries(CORS).forEach(([k, v]) => resp.setHeader(k, v))
    resp.statusCode = 204
    resp.end()
    return
  }

  try {
    const { phone } = await parseBody(req)
    if (!phone) return json(resp, 400, { error: "请输入手机号" })

    const digits = phone.replace(/\D/g, "")
    if (digits.length < 8 || digits.length > 15) {
      return json(resp, 400, { error: "手机号格式不正确" })
    }

    const client = getClient()
    const { phoneNumber, countryCode } = parsePhone(phone)

    const reqObj = new Client.SendSmsVerifyCodeRequest({
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

    const res = await client.sendSmsVerifyCodeWithOptions(reqObj, { ignoreSSL: true })
    console.log("[send-sms] OK:", phoneNumber)

    if (res.body?.code !== "OK") {
      return json(resp, 500, { error: `[${res.body?.code}] ${res.body?.message || "短信发送失败"}` })
    }

    return json(resp, 200, { ok: true })
  } catch (err) {
    console.error("[send-sms]", err)
    return json(resp, 500, { error: `发送失败：${err.message}` })
  }
}
