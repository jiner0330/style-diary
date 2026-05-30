import { NextResponse } from "next/server"
import { readFile, stat } from "fs/promises"
import path from "path"

const OUT_DIR = path.join(process.cwd(), "public", "outputs")

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ seed: string }> }
) {
  try {
    const { seed } = await params
    const safeSeed = seed.replace(/[^a-zA-Z0-9_-]/g, "")
    const imgPath = path.join(OUT_DIR, `outfit-${safeSeed}.png`)

    await stat(imgPath)

    const buffer = await readFile(imgPath)
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 })
  }
}
