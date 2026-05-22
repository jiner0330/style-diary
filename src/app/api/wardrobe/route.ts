import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { classifyClothing } from "@/lib/ai"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  return null
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

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "请选择图片" }, { status: 400 })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "仅支持 JPG/PNG/WebP/HEIC 格式" }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "图片大小不能超过 10MB" }, { status: 400 })
    }

    const userId = user.id
    const fileExt = file.name.split(".").pop() || "jpg"
    const itemId = crypto.randomUUID()
    const storagePath = `${userId}/${itemId}.${fileExt}`

    // 1. 上传到 Storage
    const buffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from("wardrobe")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("[upload] Storage error:", uploadError)
      return NextResponse.json({ error: "图片上传失败，请重试" }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("wardrobe")
      .getPublicUrl(storagePath)

    const imageUrl = urlData.publicUrl

    // 2. AI 识别完整单品信息
    let category = "top"
    let itemName = file.name.replace(/\.[^.]+$/, "").slice(0, 30)
    let sub_category: string | null = null
    let color = "#FAF7F4"
    let material: string | null = null
    let pattern: string | null = null
    let detail: string | null = null
    let style_tags: string[] = []
    try {
      const result = await classifyClothing(imageUrl)
      category = result.category
      itemName = result.name
      sub_category = result.sub_category
      color = result.color
      material = result.material
      pattern = result.pattern
      detail = result.detail
      style_tags = result.style_tags
      console.log(`[upload] AI 识别: ${category} | ${itemName} | sub:${sub_category} | color:${color} | material:${material} | pattern:${pattern} | tags:${style_tags.join(",")}`)
    } catch (err) {
      console.warn("[upload] AI 识别失败，使用默认值:", err)
    }

    // 3. 写入 clothing_items
    const { data: item, error: dbError } = await supabase
      .from("clothing_items")
      .insert({
        user_id: userId,
        name: itemName,
        category,
        sub_category,
        color,
        material,
        pattern,
        detail,
        style_tags,
        image_url: imageUrl,
      })
      .select()
      .single()

    if (dbError) {
      console.error("[upload] DB error:", dbError)
      return NextResponse.json({ error: "记录创建失败，请重试" }, { status: 500 })
    }

    return NextResponse.json({ item })
  } catch (err) {
    console.error("[upload] Error:", err)
    const message = err instanceof Error ? err.message : "未知错误"
    return NextResponse.json({ error: `上传失败: ${message}` }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    let query = supabase
      .from("clothing_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (category) {
      query = query.eq("category", category)
    }

    const { data: items, error } = await query

    if (error) {
      console.error("[wardrobe] DB error:", error)
      return NextResponse.json({ error: "查询失败" }, { status: 500 })
    }

    return NextResponse.json({ items: items || [] })
  } catch (err) {
    console.error("[wardrobe] Error:", err)
    return NextResponse.json({ error: "获取衣橱失败" }, { status: 500 })
  }
}
