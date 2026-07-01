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
    console.log(`[upload] step1: buffer=${(buffer.byteLength/1024).toFixed(0)}KB type=${file.type} name=${file.name}`)
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
    console.log(`[upload] step2: storage OK, url=${imageUrl.slice(0,60)}...`)

    // 2. AI 识别完整单品信息（传 buffer 走 base64，避免 ofox.ai 无法访问 Supabase URL）
    let category = "top"
    let itemName = file.name.replace(/\.[^.]+$/, "").slice(0, 30)
    let sub_category: string | null = null
    let color = "#FAF7F4"
    let material: string | null = null
    let pattern: string | null = null
    let detail: string | null = null
    let style_tags: string[] = []
    let fit: string | null = null
    let length: string | null = null
    let neckline: string | null = null
    try {
      const result = await classifyClothing(buffer, file.type)
      category = result.category
      itemName = result.name
      sub_category = result.sub_category
      color = result.color
      material = result.material
      pattern = result.pattern
      detail = result.detail
      style_tags = result.style_tags
      fit = result.fit ?? null
      length = result.length ?? null
      neckline = result.neckline ?? null
      console.log(`[upload] step3: AI OK - ${category} | ${itemName} | sub:${sub_category} | color:${color} | fit:${fit} | tags:${style_tags.join(",")}`)
    } catch (err) {
      console.warn("[upload] step3: AI failed, using defaults:", err)
    }

    // 3. 写入 clothing_items（只插入表中存在的列）
    const insertData: Record<string, unknown> = {
      user_id: userId,
      name: itemName,
      category,
      color,
      image_url: imageUrl,
    }
    if (sub_category) insertData.sub_category = sub_category
    if (material) insertData.material = material
    if (pattern) insertData.pattern = pattern
    if (detail) insertData.detail = detail
    if (style_tags.length > 0) insertData.style_tags = style_tags
    if (fit) insertData.fit = fit
    if (length) insertData.length = length
    if (neckline) insertData.neckline = neckline
    console.log(`[upload] step4: inserting`, JSON.stringify({...insertData, user_id: '...', image_url: '...'}))
    const { data: item, error: dbError } = await supabase
      .from("clothing_items")
      .insert(insertData)
      .select()
      .single()

    if (dbError) {
      console.error("[upload] DB error:", dbError)
      return NextResponse.json({ error: "记录创建失败，请重试" }, { status: 500 })
    }

    return NextResponse.json({ item })
  } catch (err) {
    console.error("[upload] Error:", err)
    return NextResponse.json({ error: "上传失败，请稍后重试" }, { status: 500 })
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

export async function DELETE(request: NextRequest) {
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
    const itemId = searchParams.get("id")
    if (!itemId) {
      return NextResponse.json({ error: "缺少单品 ID" }, { status: 400 })
    }

    // 查找单品，确保属于当前用户
    const { data: item, error: findErr } = await supabase
      .from("clothing_items")
      .select("id, user_id, image_url")
      .eq("id", itemId)
      .single()

    if (findErr || !item) {
      return NextResponse.json({ error: "单品不存在" }, { status: 404 })
    }
    if (item.user_id !== user.id) {
      return NextResponse.json({ error: "无权删除" }, { status: 403 })
    }

    // 从 storage 中删除图片
    const url = new URL(item.image_url)
    const pathSegments = url.pathname.replace("/storage/v1/object/public/", "").split("/")
    const storagePath = pathSegments.slice(1).join("/")
    if (storagePath) {
      await supabase.storage.from("wardrobe").remove([storagePath])
    }

    // 从数据库中删除记录
    const { error: deleteErr } = await supabase
      .from("clothing_items")
      .delete()
      .eq("id", itemId)

    if (deleteErr) {
      console.error("[wardrobe] Delete error:", deleteErr)
      return NextResponse.json({ error: "删除失败" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[wardrobe] DELETE error:", err)
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
