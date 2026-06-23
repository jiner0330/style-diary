"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"
import { Suspense } from "react"

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<"phone" | "email">("phone")

  // 手机号登录
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 邮箱登录
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const [error, setError] = useState("")
  const redirect = searchParams.get("redirect") || "/scenes"

  useEffect(() => {
    const err = searchParams.get("error")
    if (err) setError(decodeURIComponent(err))
  }, [searchParams])

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }
    timerRef.current = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [countdown])

  // 发送验证码
  async function sendCode() {
    const raw = phone.trim()
    if (!raw) { setError("请输入手机号"); return }
    const full = raw.replace(/\D/g, "")
    setError("")
    setPhoneLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_FC_SEND_SMS_URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: full }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "发送失败"); setPhoneLoading(false); return }
      setCodeSent(true)
      setCountdown(60)
      toast.success("验证码已发送")
    } catch {
      setError("网络错误，请重试")
    }
    setPhoneLoading(false)
  }

  // 手机号验证码登录
  async function handlePhoneLogin(e: React.FormEvent) {
    e.preventDefault()
    if (phoneLoading) return
    const raw = phone.trim()
    const token = code.trim()
    if (!raw || !token) { setError("请输入手机号和验证码"); return }
    const full = raw.replace(/\D/g, "")
    setError("")
    setPhoneLoading(true)
    try {
      // 1. 验证验证码
      const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_FC_VERIFY_SMS_URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: full, code: token }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) { setError(verifyData.error); setPhoneLoading(false); return }

      // 2. 用返回的凭据登录 Supabase（客户端直连，绕过 hkg1 DNS 问题）
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: verifyData.email,
        password: verifyData.password,
      })
      if (signInErr) {
        // 用户不存在 → 客户端注册（Supabase 上海直连，不走 Vercel）
        if (signInErr.message?.includes("Invalid") || signInErr.status === 400) {
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: verifyData.email,
            password: verifyData.password,
            options: { data: { phone: full } },
          })
          if (signUpErr) { setError(signUpErr.message); setPhoneLoading(false); return }
          if (!signUpData.session) {
            setError("注册请求已提交，请在 Supabase 关闭邮箱确认后重试"); setPhoneLoading(false); return
          }
          toast.success("注册成功 ✨")
          router.push("/onboarding")
          return
        }
        setError(signInErr.message); setPhoneLoading(false); return
      }
      if (!data.session) { setError("登录失败，请重试"); setPhoneLoading(false); return }

      toast.success("登录成功 ✨")
      const { data: profile } = await supabase
        .from("user_profiles").select("gender").eq("user_id", data.session.user.id).maybeSingle()
      router.push(profile ? redirect : "/onboarding")
    } catch (err: any) {
      setError(err.message || "网络错误")
      setPhoneLoading(false)
    }
  }

  // 邮箱密码登录/注册
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    const em = email.trim()
    const pw = password
    setError("")
    if (!em || !pw) { setError("请填写邮箱和密码"); return }
    if (pw.length < 6) { setError("密码至少 6 位"); return }

    setLoading(true)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: em, password: pw })
      if (authError) {
        // 登录失败，尝试注册
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email: em, password: pw })
        if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
        if (!signUpData.session) {
          setError("注册成功，请查收邮箱确认邮件后返回登录")
          setLoading(false)
          return
        }
        toast.success("注册成功 ✨")
        router.push("/onboarding")
        return
      }
      if (!data.session) { setError("登录失败，请重试"); setLoading(false); return }
      toast.success("欢迎回来 ✨")
      const { data: profile } = await supabase
        .from("user_profiles").select("gender").eq("user_id", data.session.user.id).maybeSingle()
      router.push(profile ? redirect : "/onboarding")
    } catch (err: any) {
      setError(err.message || "网络错误")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 justify-center px-4 gap-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-wider text-charcoal">
          欢迎使用搭搭
        </h1>
        <p className="text-sm text-warm-gray">
          登录后开始风格探索
        </p>
      </div>

      {/* 登录方式切换 */}
      <div className="flex rounded-xl bg-cream/50 p-1">
        <button
          type="button"
          onClick={() => { setMode("phone"); setError("") }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "phone" ? "bg-white text-charcoal shadow-sm" : "text-warm-gray"
          }`}
        >
          手机号登录
        </button>
        <button
          type="button"
          onClick={() => { setMode("email"); setError("") }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "email" ? "bg-white text-charcoal shadow-sm" : "text-warm-gray"
          }`}
        >
          邮箱登录
        </button>
      </div>

      {/* 手机号登录表单 */}
      {mode === "phone" && (
        <form onSubmit={handlePhoneLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-charcoal mb-1.5">手机号</label>
            <div className="flex gap-1.5">
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(""); setCodeSent(false) }}
                placeholder="输入手机号"
                className="flex-1 min-w-0 px-3 py-3 rounded-xl border border-warm-gray bg-soft-white
                           text-charcoal placeholder:text-warm-gray/60 text-sm
                           focus:outline-none focus:border-rose transition-colors"
              />
              <button
                type="button"
                onClick={sendCode}
                disabled={countdown > 0 || phoneLoading}
                className="flex-shrink-0 px-2.5 py-3 rounded-xl text-xs font-medium whitespace-nowrap
                           bg-rose text-white disabled:opacity-50 disabled:cursor-not-allowed
                           active:scale-[0.98] transition-all"
                style={{ touchAction: "manipulation" }}
              >
                {countdown > 0 ? `${countdown}s` : codeSent ? "重发" : "发送验证码"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-charcoal mb-1.5">验证码</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError("") }}
              placeholder="输入 6 位验证码"
              className="w-full px-3 py-3 rounded-xl border border-warm-gray bg-soft-white
                         text-charcoal placeholder:text-warm-gray/60 text-sm
                         focus:outline-none focus:border-rose transition-colors"
            />
          </div>

          {error && (
            <div className="px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={phoneLoading}
            className="w-full py-3 rounded-2xl bg-charcoal text-soft-white font-medium
                       tracking-wide transition-all active:scale-[0.98]
                       disabled:opacity-50 disabled:active:scale-100"
            style={{ touchAction: "manipulation" }}
          >
            {phoneLoading ? "请稍候..." : "登录 / 注册"}
          </button>
        </form>
      )}

      {/* 邮箱登录表单 */}
      {mode === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
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
              className="w-full px-3 py-3 rounded-xl border border-warm-gray bg-soft-white
                         text-charcoal placeholder:text-warm-gray/60 text-sm
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
              className="w-full px-3 py-3 rounded-xl border border-warm-gray bg-soft-white
                         text-charcoal placeholder:text-warm-gray/60 text-sm
                         focus:outline-none focus:border-rose transition-colors"
            />
          </div>

          {error && (
            <div className="px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-charcoal text-soft-white font-medium
                       tracking-wide transition-all active:scale-[0.98]
                       disabled:opacity-50 disabled:active:scale-100"
            style={{ touchAction: "manipulation" }}
          >
            {loading ? "请稍候..." : "登录"}
          </button>

          <p className="text-xs text-center text-warm-gray/50">
            首次登录将自动创建账号
          </p>
        </form>
      )}
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center"><p className="text-warm-gray animate-pulse">加载中...</p></div>}>
      <AuthForm />
    </Suspense>
  )
}
