import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  return null
}

// 游客单品（localStorage 里的形状，够迁移用）
interface GuestItem {
  id: string
  name: string
  category: string
  color: string
  image_url: string
  sub_category?: string | null
  material?: string | null
  pattern?: string | null
  detail?: string | null
  style_tags?: string[]
  fit?: string | null
  length?: string | null
  neckline?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const token = getToken(request)
    if (!token) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const body = await request.json()
    const items = (body.items || []) as GuestItem[]

    const migrated: unknown[] = []
    for (const item of items) {
      try {
        if (!item.image_url) continue

        // 1. 从游客桶的公开 URL 下载图片字节（guest-wardrobe 是 public 桶，无需鉴权）
        const imgRes = await fetch(item.image_url)
        if (!imgRes.ok) {
          console.warn(`[migrate] download fail ${imgRes.status}: ${item.image_url.slice(0, 60)}`)
          continue
        }
        const buffer = await imgRes.arrayBuffer()
        const contentType = imgRes.headers.get("content-type") || "image/jpeg"

        // 2. 上传到用户私有桶
        const newId = crypto.randomUUID()
        const fileExt = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg"
        const storagePath = `${user.id}/${newId}.${fileExt}`
        const { error: upErr } = await supabase.storage
          .from("wardrobe")
          .upload(storagePath, buffer, { contentType, upsert: false })
        if (upErr) {
          console.warn("[migrate] upload fail:", upErr.message)
          continue
        }
        const { data: urlData } = supabase.storage.from("wardrobe").getPublicUrl(storagePath)
        const imageUrl = urlData.publicUrl

        // 3. 插入 item 记录（复用已有识别结果，不重新识别）
        const insertData: Record<string, unknown> = {
          user_id: user.id,
          name: item.name,
          category: item.category,
          color: item.color,
          image_url: imageUrl,
        }
        if (item.sub_category) insertData.sub_category = item.sub_category
        if (item.material) insertData.material = item.material
        if (item.pattern) insertData.pattern = item.pattern
        if (item.detail) insertData.detail = item.detail
        if (item.style_tags && item.style_tags.length > 0) insertData.style_tags = item.style_tags
        if (item.fit) insertData.fit = item.fit
        if (item.length) insertData.length = item.length
        if (item.neckline) insertData.neckline = item.neckline

        const { data: newItem, error: dbErr } = await supabase
          .from("clothing_items")
          .insert(insertData)
          .select()
          .single()
        if (dbErr || !newItem) {
          console.warn("[migrate] insert fail:", dbErr?.message)
          continue
        }
        migrated.push(newItem)
      } catch (e) {
        console.warn("[migrate] item fail:", e)
      }
    }

    console.log(`[migrate] done: ${migrated.length}/${items.length} migrated`)
    return NextResponse.json({ items: migrated, count: migrated.length })
  } catch (err) {
    console.error("[migrate] Error:", err)
    return NextResponse.json({ error: "迁移失败，请稍后重试" }, { status: 500 })
  }
}
