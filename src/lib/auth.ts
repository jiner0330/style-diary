import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  return null
}

/** 验证请求中的用户身份，未登录返回 null */
export async function requireAuth(request: NextRequest): Promise<string | null> {
  const token = getToken(request)
  if (!token) return null
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user } } = await supabase.auth.getUser(token)
    return user?.id ?? null
  } catch {
    return null
  }
}
