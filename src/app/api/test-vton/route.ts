import { NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "fs/promises"
import https from "https"
import path from "path"
import Service from "@volcengine/openapi/lib/base/service"

// 绕过公司网络代理的 SSL 证书验证（仅测试用）
const httpsAgent = new https.Agent({ rejectUnauthorized: false })
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const AK = process.env.VOLC_ACCESS_KEY!
const SK = process.env.VOLC_SECRET_KEY!

// 使用官方 SDK 创建 CV 服务（自动处理 HMAC-SHA256 签名）
const cvService = new Service({
  host: "visual.volcengineapi.com",
  region: "cn-north-1",
  serviceName: "cv",
  defaultVersion: "2022-08-31",
  accessKeyId: AK,
  secretKey: SK,
})

// 创建 dressing_diffusion 的提交和查询 API 函数
const submitTask = cvService.createJSONAPI("CVSync2AsyncSubmitTask", {
  Version: "2022-08-31",
  method: "POST",
  contentType: "json",
})

const getResult = cvService.createJSONAPI("CVSync2AsyncGetResult", {
  Version: "2022-08-31",
  method: "POST",
  contentType: "json",
})

export async function POST(request: Request) {
  try {
    if (!AK || !SK) {
      return NextResponse.json(
        { error: "请在 .env.local 设置 VOLC_ACCESS_KEY 和 VOLC_SECRET_KEY" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { gender, items } = body as {
      gender: string
      items: { slot: string; name: string; image_url?: string }[]
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "请提供至少一件单品" }, { status: 400 })
    }

    // 加载人台图为 base64
    const mannequinFile = gender === "female"
      ? "mannequin-female-000.png"
      : "mannequin-male.png"
    const mannequinPath = path.join(process.cwd(), "public", mannequinFile)
    const mannequinBuf = await readFile(mannequinPath)
    const mannequinB64 = mannequinBuf.toString("base64")
    console.log(`[vton] Mannequin: ${mannequinFile} (${mannequinBuf.length} bytes)`)

    // 加载服装图
    const garmentItem = items.find(i => i.image_url && !i.image_url.startsWith("data:image/svg+xml"))
    if (!garmentItem?.image_url) {
      return NextResponse.json({ error: "没有可用的服装图片" }, { status: 400 })
    }

    const garmentPath = path.join(
      process.cwd(), "public",
      garmentItem.image_url.split("?")[0]
    )
    const garmentBuf = await readFile(garmentPath)
    const garmentB64 = garmentBuf.toString("base64")
    console.log(`[vton] Garment: ${garmentItem.name} (${garmentBuf.length} bytes)`)

    const mannequinUri = `data:image/png;base64,${mannequinB64}`
    const garmentDataUri = `data:image/png;base64,${garmentB64}`

    // 提交任务
    console.log("[vton] Submitting dressing_diffusion task...")
    const submitResp = await submitTask({
      req_key: "dressing_diffusion",
      model: { id: "1", url: mannequinUri },
      garment: { id: "1", data: [{ url: garmentDataUri }] },
      inference_config: {
        seed: -1,
        keep_head: true,
        keep_hand: true,
        keep_foot: true,
        do_sr: true,
        num_steps: 50,
      },
    }, { httpsAgent })

    console.log("[vton] Submit response:", JSON.stringify(submitResp).slice(0, 500))

    if ((submitResp as any).ResponseMetadata?.Error) {
      const err = (submitResp as any).ResponseMetadata.Error
      return NextResponse.json({
        error: `提交失败: ${err.Code} - ${err.Message}`,
      }, { status: 500 })
    }

    // 兼容不同的响应格式
    const taskData = (submitResp as any).data || (submitResp as any).Result
    const taskId = taskData?.task_id
    if (!taskId) {
      return NextResponse.json({
        error: "未获取到 task_id",
        detail: submitResp,
      }, { status: 500 })
    }

    console.log("[vton] Task ID:", taskId)

    // 轮询结果
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 5_000))

      const pollResp = await getResult({
        req_key: "dressing_diffusion",
        task_id: taskId,
        req_json: JSON.stringify({ return_url: true }),
      }, { httpsAgent })

      const pollData = (pollResp as any).data || (pollResp as any).Result
      const status = pollData?.status
      console.log(`[vton] Poll ${i + 1}: ${status}`)

      if (status === "done") {
        const imageUrls: string[] = pollData?.image_urls || []
        const b64Images: string[] = pollData?.binary_data_base64 || []

        let imageB64 = b64Images.length > 0 ? b64Images[0] : undefined
        if (!imageB64 && imageUrls.length > 0) {
          const dlRes = await fetch(imageUrls[0], { signal: AbortSignal.timeout(15_000) })
          if (dlRes.ok) {
            imageB64 = Buffer.from(await dlRes.arrayBuffer()).toString("base64")
          }
        }

        if (imageB64) {
          const outDir = path.join(process.cwd(), "public", "outputs")
          await mkdir(outDir, { recursive: true })
          const filename = `vton-${Date.now()}.png`
          await writeFile(path.join(outDir, filename), Buffer.from(imageB64, "base64"))

          return NextResponse.json({
            imageUrl: `/outputs/${filename}`,
            mode: "vton",
            taskId,
          })
        }
        return NextResponse.json({ error: "未返回图片数据" }, { status: 500 })
      }

      if (status === "failed") {
        return NextResponse.json({
          error: `任务失败: ${JSON.stringify(pollResp)}`,
        }, { status: 500 })
      }
    }

    return NextResponse.json({ error: "任务超时", taskId }, { status: 500 })
  } catch (err) {
    console.error("[test-vton]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务器内部错误" },
      { status: 500 }
    )
  }
}
