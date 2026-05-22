
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getAuthToken(): Promise<string | null> {
  try {
    // 主路径：从 Supabase session 获取
    const { data } = await supabase.auth.getSession()
    if (data.session?.access_token) {
      // 验证 token 是否过期，过期则尝试刷新
      const expiresAt = data.session.expires_at
      const now = Math.floor(Date.now() / 1000)
      if (expiresAt && now > expiresAt - 60) {
        const { data: refreshed } = await supabase.auth.refreshSession()
        if (refreshed.session?.access_token) return refreshed.session.access_token
      }
      return data.session.access_token
    }

    // 兜底：直接从 localStorage 读取
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
        try {
          const val = JSON.parse(localStorage.getItem(key) || "{}")
          if (val?.access_token) return val.access_token
        } catch {}
      }
    }
    return null
  } catch {
    return null
  }
}