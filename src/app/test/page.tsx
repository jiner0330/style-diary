"use client"

import { useState, useRef, useEffect } from "react"

export default function TestPage() {
  const [text, setText] = useState("")
  const [log, setLog] = useState<string[]>([])
  const btnRef = useRef<HTMLButtonElement>(null)
  const textRef = useRef("")
  textRef.current = text

  function addLog(msg: string) {
    setLog((prev) => [...prev, `${new Date().toISOString().slice(11, 19)} ${msg}`])
  }

  async function doClick() {
    addLog("按钮被点击")
    const t = textRef.current
    if (!t) {
      addLog("输入为空")
      return
    }

    addLog("开始请求...")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: t, password: "test" }),
      })
      const data = await res.json()
      addLog(`响应: ${res.status} ${JSON.stringify(data).slice(0, 60)}`)
    } catch (err: any) {
      addLog(`错误: ${err.message}`)
    }
  }

  useEffect(() => {
    const el = btnRef.current
    if (!el) return

    function onClick(e: Event) {
      e.preventDefault()
      e.stopPropagation()
      doClick()
    }

    el.addEventListener("click", onClick)
    el.addEventListener("touchend", onClick)
    return () => {
      el.removeEventListener("click", onClick)
      el.removeEventListener("touchend", onClick)
    }
  }, [])

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">移动端按钮测试</h1>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="输入任意文字"
        className="w-full px-4 py-3 rounded-xl border border-warm-gray bg-soft-white"
      />

      <button
        ref={btnRef}
        type="button"
        style={{ touchAction: "manipulation" }}
        className="w-full py-3 rounded-2xl bg-rose text-white font-medium"
      >
        点击测试 (原生事件)
      </button>

      <a href="/auth" className="text-rose underline text-center">去登录页</a>

      <div className="bg-cream rounded-xl p-3 text-xs space-y-1">
        {log.length === 0 && <p className="text-warm-gray/50">日志区域 — 点击按钮开始</p>}
        {log.map((l, i) => (
          <p key={i} className="text-charcoal">{l}</p>
        ))}
      </div>
    </div>
  )
}
