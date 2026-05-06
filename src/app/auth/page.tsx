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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success("欢迎回来 ✨")
        router.push("/scenes")
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        // 如果 Supabase 开启了邮箱确认，signUp 不会自动建立会话
        if (data.session) {
          toast.success("注册成功 ✨")
          router.push("/onboarding")
        } else {
          toast.success("注册成功！请查看邮箱确认链接，确认后重新登录")
          setIsLogin(true)
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "出错了，请稍后再试"
      toast.error(message)
    } finally {
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
          {isLogin ? "小裁在等你" : "和小裁一起开始风格探索"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-charcoal mb-1.5">邮箱</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
            className="w-full px-4 py-3 rounded-xl border border-warm-gray bg-soft-white
                       text-charcoal placeholder:text-warm-gray/60
                       focus:outline-none focus:border-rose transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-rose text-soft-white font-medium
                     tracking-wide transition-all active:scale-[0.98]
                     disabled:opacity-50 disabled:active:scale-100"
        >
          {loading ? "请稍候..." : isLogin ? "登录" : "注册"}
        </button>
      </form>

      <button
        onClick={() => setIsLogin(!isLogin)}
        className="text-sm text-center text-warm-gray hover:text-rose transition-colors"
      >
        {isLogin ? "还没有账号？去注册 →" : "已有账号？去登录 →"}
      </button>
    </div>
  )
}
