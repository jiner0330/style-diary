import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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
      // 未登录用户也接受埋点，但不关联 user_id
      return NextResponse.json({ ok: true })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return NextResponse.json({ ok: true })
    }

    const body = await request.json()
    const { events } = body as { events: { event: string; sceneId?: string | null; properties?: Record<string, unknown> }[] }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ ok: true })
    }

    const rows = events.map((e) => ({
      user_id: user.id,
      event: e.event,
      scene_id: e.sceneId ?? null,
      properties: e.properties ?? {},
    }))

    const { error } = await supabase.from("user_events").insert(rows)
    if (error) {
      console.warn("[events] insert error:", error.message)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.warn("[events] POST error:", err instanceof Error ? err.message : err)
    // 始终返回 200，不阻塞客户端
    return NextResponse.json({ ok: true })
  }
}
