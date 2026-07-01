const sharp = require("sharp")
const fs = require("fs")
const path = require("path")

const INPUT_DIR = path.join(__dirname, "screenshots")
const OUTPUT_DIR = path.join(__dirname, "screenshots-watermarked")

if (!fs.existsSync(INPUT_DIR)) {
  console.log(`请创建 ${INPUT_DIR} 目录，把截图放进去`)
  process.exit(0)
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const files = fs.readdirSync(INPUT_DIR).filter(f => /\.(png|jpg|jpeg)$/i.test(f))

if (files.length === 0) {
  console.log(`${INPUT_DIR} 里没有图片，请放入截图`)
  process.exit(0)
}

async function addWatermark(inputPath, outputPath) {
  const image = sharp(inputPath)
  const metadata = await image.metadata()
  const { width, height } = metadata

  // 斜向水印：大字号、半透明、多行覆盖全图
  const fontSize = Math.round(Math.min(width, height) * 0.08)
  const spacing = fontSize * 6
  const text = "dada-ai.cn"

  // 生成水印行：斜线排列，覆盖全图
  let watermarks = ""
  const diagonal = width + height
  const cols = Math.ceil(diagonal / spacing) + 4
  const rows = Math.ceil(diagonal / spacing) + 4

  for (let row = -2; row < rows; row++) {
    for (let col = -2; col < cols; col++) {
      const x = col * spacing - row * spacing * 0.7
      const y = col * spacing * 0.7 + row * spacing
      if (x > -spacing && x < width + spacing && y > -spacing && y < height + spacing) {
        watermarks += `
          <text x="${x}" y="${y}"
                transform="rotate(-30, ${x}, ${y})"
                text-anchor="middle"
                font-family="system-ui, -apple-system, sans-serif"
                font-size="${fontSize}" font-weight="600"
                fill="rgba(0,0,0,0.08)"
                letter-spacing="4">
            ${text}
          </text>`
      }
    }
  }

  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${watermarks}
    </svg>
  `

  const svgBuffer = Buffer.from(svgOverlay)

  await sharp(inputPath)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toFile(outputPath)

  console.log(`  ✓ ${path.basename(inputPath)}`)
}

async function main() {
  console.log(`处理 ${files.length} 张截图...\n`)
  for (const file of files) {
    await addWatermark(path.join(INPUT_DIR, file), path.join(OUTPUT_DIR, file))
  }
  console.log(`\n完成 → ${OUTPUT_DIR}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
