"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    const em = email.trim()
    const pw = password
    setError("")

    if (!em || !pw) {
      setError("请填写邮箱和密码")
      return
    }
    if (pw.length < 6) {
      setError("密码至少 6 位")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password: pw }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "登录失败")
        setLoading(false)
        return
      }

      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      toast.success("欢迎回来 ✨")
      router.push("/scenes")
    } catch (err: any) {
      setError(err.message || "网络错误，请检查网络连接")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 justify-center px-6 gap-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-wider text-charcoal">
          {isLogin ? "欢迎回来" : "创建账号"}
        </h1>
        <p className="text-sm text-warm-gray">
          {isLogin ? "搭搭在等你" : "和搭搭一起开始风格探索"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-charcoal mb-1.5">邮箱</label>
          <input
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError("") }}
            placeholder="your@email.com"
            className="w-full px-4 py-3 rounded-xl border border-warm-gray bg-soft-white
                       text-charcoal placeholder:text-warm-gray/60
                       focus:outline-none focus:border-rose transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-charcoal mb-1.5">密码</label>
          <input
            type="password"
            autoCapitalize="none"
            autoCorrect="off"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError("") }}
            placeholder="至少 6 位"
            className="w-full px-4 py-3 rounded-xl border border-warm-gray bg-soft-white
                       text-charcoal placeholder:text-warm-gray/60
                       focus:outline-none focus:border-rose transition-colors"
          />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-rose text-soft-white font-medium
                     tracking-wide transition-all active:scale-[0.98]
                     disabled:opacity-50 disabled:active:scale-100"
          style={{ touchAction: "manipulation" }}
        >
          {loading ? "请稍候..." : isLogin ? "登录" : "注册"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => { setIsLogin((v) => !v); setError("") }}
        className="text-sm text-center text-warm-gray hover:text-rose transition-colors"
        style={{ touchAction: "manipulation" }}
      >
        {isLogin ? "还没有账号？去注册 →" : "已有账号？去登录 →"}
      </button>
    </div>
  )
}
