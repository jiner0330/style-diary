import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const { data, error } = await supabase
      .from("scenes")
      .select("*")
      .order("sort_order")

    if (error) throw error

    return NextResponse.json({ scenes: data || [] })
  } catch (err) {
    console.error("[scenes]", err)
    return NextResponse.json(
      { error: "加载场景失败" },
      { status: 500 }
    )
  }
}
