"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  const [images, setImages] = useState<string[]>([])
  const [hasAccount, setHasAccount] = useState(false)

  useEffect(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
          const val = JSON.parse(localStorage.getItem(key) || "{}")
          if (val?.access_token) { setHasAccount(true); break }
        }
      }
    } catch {}
    setImages([
      "/showcase-1.jpg",
      "/showcase-2.jpg",
      "/showcase-3.jpg",
      "/showcase-4.jpg",
    ])
  }, [])

  function selectGender(gender: "female" | "male") {
    try { localStorage.setItem("guest_gender", gender) } catch {}
    router.push("/scenes")
  }

  return (
    <div className="flex flex-col flex-1 items-center px-6 py-10">
      {/* Hero */}
      <div className="flex flex-col items-center gap-1 mb-8">
        <h1 className="text-3xl font-semibold tracking-[0.2em] text-charcoal">搭搭</h1>
        <p className="text-[15px] text-charcoal/70 font-medium mt-2">把你衣柜里的衣服，搭出好方案</p>
        <p className="text-[13px] text-warm-gray">约会 · 通勤 · 日常，基于你真实衣橱的智能搭配</p>
      </div>

      {/* 性别选择卡片 */}
      <p className="text-xs text-warm-gray/60 mb-3 tracking-wide">选择你的风格</p>
      <div className="flex gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={() => selectGender("female")}
          className="flex-1 flex flex-col items-center justify-center gap-2
                     py-8 rounded-2xl
                     bg-white border border-warm-gray/20
                     shadow-sm hover:shadow-md
                     active:scale-[0.97] transition-all duration-150
                     group"
        >
          <span className="text-4xl font-light text-rose/80 group-active:text-rose transition-colors">
            &#9793;
          </span>
          <span className="text-sm font-medium text-charcoal/70">女生搭配</span>
        </button>

        <button
          type="button"
          onClick={() => selectGender("male")}
          className="flex-1 flex flex-col items-center justify-center gap-2
                     py-8 rounded-2xl
                     bg-white border border-warm-gray/20
                     shadow-sm hover:shadow-md
                     active:scale-[0.97] transition-all duration-150
                     group"
        >
          <span className="text-4xl font-light text-charcoal/60 group-active:text-charcoal transition-colors">
            &#9794;
          </span>
          <span className="text-sm font-medium text-charcoal/70">男生搭配</span>
        </button>
      </div>

      {/* 效果图展示 */}
      <div className="w-full max-w-xs mt-10 space-y-2.5">
        <p className="text-[11px] text-center text-warm-gray/40 tracking-wider">AI 搭配效果</p>
        <div className="grid grid-cols-2 gap-2">
          {images.map((src, i) => (
            <div key={src} className="rounded-xl overflow-hidden bg-cream/20 aspect-[3/4]">
              <img
                src={src}
                alt={`搭配效果示例 ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none"
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 底部 */}
      <p className="mt-8 text-[13px]">
        {hasAccount ? (
          <button
            type="button"
            onClick={() => router.push("/scenes")}
            className="text-charcoal/50 hover:text-rose transition-colors"
          >
            欢迎回来，继续探索 →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/auth")}
            className="text-warm-gray/40 hover:text-rose transition-colors"
          >
            已有账号？登录
          </button>
        )}
      </p>
    </div>
  )
}
