import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { enrichScene } from "@/lib/scene-assets"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data, error } = await supabase
      .from("scenes")
      .select("*")
      .order("sort_order")

    if (error) throw error

    const scenes = (data || []).map(enrichScene)

    return NextResponse.json({ scenes })
  } catch (err) {
    console.error("[scenes]", err)
    return NextResponse.json(
      { error: "加载场景失败" },
      { status: 500 }
    )
  }
}
