/**
 * 验证 ofox.ai 是否支持并发生图
 *
 * 用法: node scripts/test-concurrency.js
 *
 * 判断标准：
 *   两个请求同时发出，如果都在 ~60s 内完成 → 支持并发
 *   如果总耗时 ~120s → 串行排队，不支持
 */

const fs = require("fs")
const path = require("path")

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

// 从 .env.local 读取 API key
const envPath = path.join(__dirname, "..", ".env.local")
const envContent = fs.readFileSync(envPath, "utf-8")
const match = envContent.match(/OFOXAI_API_KEY=(.+)/)
const KEY = match ? match[1].trim() : null
if (!KEY) {
  console.error("❌ 缺少 OFOXAI_API_KEY，请在 .env.local 中设置")
  process.exit(1)
}

const BASE = process.env.OFOXAI_BASE_URL || "https://api.ofox.ai"
const MODEL = "openai/gpt-image-2"

const PROMPT = `A hand-drawn watercolor fashion illustration, game asset style, clear clean contour lines. Cream paper texture background with pure white base.

The figure is a young female mannequin, front view facing camera directly. Illustration-style face with big round amber eyes, doll-like delicate features. Translucent fair skin with a creamy porcelain finish. Muted golden brown hair with a matte finish, pulled into a neat bun. Slim build, standard A-pose with arms held 30 degrees away from body.

She is wearing:
- Top: A burgundy red off-shoulder long-sleeve blouse. Slim fitted silhouette. Clean cotton fabric.
- Bottom: Cream white high-waisted cotton shorts with folded cuffs.

Strictly no accessories, no patterns, no bows, no extra decorations. No shoes.`

async function generateOne(label) {
  const startedAt = Date.now()
  console.log(`[${label}] 🚀 发起请求 ${new Date().toISOString()}`)

  let error = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 180_000)

      const res = await fetch(`${BASE}/v1/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          prompt: PROMPT,
          n: 1,
          size: "768x1152",
          response_format: "b64_json",
        }),
        signal: ctrl.signal,
      })
      clearTimeout(t)

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        error = `HTTP ${res.status}: ${text.slice(0, 200)}`
        if (res.status === 429) {
          console.log(`[${label}] ⚠️ 429 限流，3s 后重试...`)
          await new Promise((r) => setTimeout(r, 3000))
          continue
        }
        break
      }

      const data = await res.json()
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
      const hasImage = !!data.data?.[0]?.b64_json
      console.log(`[${label}] ✅ 完成 耗时 ${elapsed}s hasImage=${hasImage}`)
      return { label, elapsed: parseFloat(elapsed), success: true }
    } catch (err) {
      error = err.message
      if (err.message?.includes("fetch failed") || err.message?.includes("abort")) {
        console.log(`[${label}] 🔄 网络错误，重试...`)
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }
      break
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`[${label}] ❌ 失败 耗时 ${elapsed}s error=${error}`)
  return { label, elapsed: parseFloat(elapsed), success: false, error }
}

async function main() {
  console.log("=".repeat(60))
  console.log("并发生图测试 · 同时发出 2 个请求")
  console.log(`模型: ${MODEL}  |  尺寸: 768x1152`)
  console.log("=".repeat(60))

  const overallStart = Date.now()

  // 同时发起 2 个请求
  const [resultA, resultB] = await Promise.all([
    generateOne("正面"),
    generateOne("背面"),
  ])

  const totalElapsed = ((Date.now() - overallStart) / 1000).toFixed(1)

  console.log("")
  console.log("=".repeat(60))
  console.log("结果汇总")
  console.log("=".repeat(60))
  console.log(`正面: ${resultA.success ? "✅" : "❌"} ${resultA.elapsed}s`)
  console.log(`背面: ${resultB.success ? "✅" : "❌"} ${resultB.elapsed}s`)
  console.log(`总耗时: ${totalElapsed}s`)
  console.log("")

  if (resultA.success && resultB.success) {
    const maxElapsed = Math.max(resultA.elapsed, resultB.elapsed)
    const ratio = totalElapsed / maxElapsed
    if (ratio < 1.3) {
      console.log("✅ 结论: 支持并发！两个请求并行执行，总耗时接近单个请求。")
      console.log(`   并行方案可行。`)
    } else {
      console.log("⚠️ 结论: 存在排队现象。总耗时明显超过单个请求。")
      console.log(`   建议改为先后发起（间隔 500ms）避免同时撞限。`)
    }
  } else if (resultA.success || resultB.success) {
    const failed = resultA.success ? "背面" : "正面"
    console.log(`⚠️ 结论: 部分成功。「${failed}」失败，请检查错误信息。`)
  } else {
    console.log("❌ 结论: 两个请求均失败，请检查 API key 和网络。")
  }
}

main().catch((err) => {
  console.error("脚本异常:", err)
  process.exit(1)
})
