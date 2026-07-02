// Social media watermark: diagonal, bold, dark gray, 4–5 instances
// Usage: node scripts/watermark-social.mjs <input1> <input2> ...
import sharp from "sharp"
import path from "path"
import fs from "fs"

async function addWatermark(inputPath, outputPath) {
  const image = sharp(inputPath)
  const { width, height } = await image.metadata()
  const text = "dada-ai.cn"

  // Diagonal positions covering the image with 4–5 instances
  const positions = [
    { x: width * 0.15, y: height * 0.25 },
    { x: width * 0.55, y: height * 0.15 },
    { x: width * 0.35, y: height * 0.55 },
    { x: width * 0.75, y: height * 0.50 },
    { x: width * 0.60, y: height * 0.80 },
  ]

  const fontSize = Math.round(Math.min(width, height) * 0.06)

  const texts = positions.map(({ x, y }) =>
    `<text x="${x}" y="${y}"
           transform="rotate(-30, ${x}, ${y})"
           text-anchor="middle"
           font-family="system-ui, -apple-system, sans-serif"
           font-size="${fontSize}" font-weight="700"
           fill="rgba(80,80,80,0.15)"
           letter-spacing="6">
       ${text}
     </text>`
  ).join("")

  const svgOverlay = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${texts}</svg>`

  await sharp(inputPath)
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toFile(outputPath)

  console.log(`  ✓ ${path.basename(inputPath)} → ${path.basename(outputPath)}`)
}

async function main() {
  const files = process.argv.slice(2).filter(f => /\.(png|jpg|jpeg)$/i.test(f))
  if (files.length === 0) {
    console.log("Usage: node scripts/watermark-social.mjs <image1> <image2> ...")
    process.exit(1)
  }
  for (const file of files) {
    const ext = path.extname(file)
    const out = file.replace(ext, `-wm${ext}`)
    await addWatermark(file, out)
  }
  console.log("Done.")
}

main().catch(err => { console.error(err); process.exit(1) })
