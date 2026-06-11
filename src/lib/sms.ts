import Client from "@alicloud/dypnsapi20170525"
import { SendSmsVerifyCodeRequest } from "@alicloud/dypnsapi20170525"
import { CheckSmsVerifyCodeRequest } from "@alicloud/dypnsapi20170525"
import { Config } from "@alicloud/openapi-core/dist/utils"

function getClient() {
  const config = new Config({
    accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID!,
    accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET!,
  })
  config.endpoint = "dypnsapi.aliyuncs.com"
  return new Client(config)
}

/** 解析手机号，返回 { phoneNumber, countryCode } */
function parsePhone(raw: string): { phoneNumber: string; countryCode: string } {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("86") && digits.length === 13) {
    return { phoneNumber: digits.slice(2), countryCode: "86" }
  }
  return { phoneNumber: digits, countryCode: "86" }
}

/** 发送短信验证码 — 平台自动生成和管理验证码 */
export async function sendVerificationCode(phone: string) {
  const client = getClient()
  const { phoneNumber, countryCode } = parsePhone(phone)
  const req = new SendSmsVerifyCodeRequest({
    phoneNumber,
    countryCode,
    signName: process.env.ALIBABA_SMS_SIGN_NAME!,
    templateCode: process.env.ALIBABA_SMS_TEMPLATE_CODE!,
    templateParam: JSON.stringify({ code: "##code##", min: "5" }),
    codeLength: 6,
    codeType: 1,        // 纯数字
    validTime: 300,     // 5分钟有效
    interval: 60,       // 60秒后可重发
  })
  const res = await client.sendSmsVerifyCodeWithOptions(req, { ignoreSSL: true } as any)
  console.log("[sms] send response:", JSON.stringify({ code: res.body?.code, message: res.body?.message }))
  if (res.body?.code !== "OK") {
    throw new Error(`[${res.body?.code}] ${res.body?.message || "短信发送失败"}`)
  }
  return res.body
}

/** 校验短信验证码 — 平台验证 */
export async function checkVerificationCode(phone: string, code: string) {
  const client = getClient()
  const { phoneNumber, countryCode } = parsePhone(phone)
  const req = new CheckSmsVerifyCodeRequest({
    phoneNumber,
    countryCode,
    verifyCode: code,
  })
  const res = await client.checkSmsVerifyCodeWithOptions(req, { ignoreSSL: true } as any)
  console.log("[sms] check response:", JSON.stringify({ code: res.body?.code, message: res.body?.message }))
  if (res.body?.code !== "OK") {
    throw new Error(`[${res.body?.code}] ${res.body?.message || "验证码校验失败"}`)
  }
  return res.body
}
