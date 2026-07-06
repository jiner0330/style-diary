"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  const [images, setImages] = useState<string[]>([])
  const [hasAccount, setHasAccount] = useState(false)

  useEffect(() => {
    // 检测是否已登录（有无 Supabase session）
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
          const val = JSON.parse(localStorage.getItem(key) || "{}")
          if (val?.access_token) { setHasAccount(true); break }
        }
      }
    } catch {}
    // 随机展示 4 张效果图
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
    <div className="flex flex-col flex-1 items-center justify-between py-10 px-6">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        <h1 className="text-4xl font-semibold tracking-widest text-charcoal">搭搭</h1>
        <div className="text-center space-y-0.5">
          <p className="text-lg text-charcoal/80 font-medium">你的私人AI造型师</p>
          <p className="text-sm text-warm-gray">10秒出搭配</p>
        </div>

        {/* 性别选择 */}
        <div className="flex gap-4 w-full max-w-xs mt-3">
          <button
            type="button"
            onClick={() => selectGender("female")}
            className="flex-1 py-4 rounded-2xl bg-rose text-soft-white font-medium
                       text-lg tracking-wide transition-all active:scale-[0.98]"
          >
            👗 女生搭配
          </button>
          <button
            type="button"
            onClick={() => selectGender("male")}
            className="flex-1 py-4 rounded-2xl bg-charcoal text-soft-white font-medium
                       text-lg tracking-wide transition-all active:scale-[0.98]"
          >
            👔 男生搭配
          </button>
        </div>
      </div>

      {/* 效果图展示 */}
      <div className="space-y-3 w-full max-w-xs mt-8">
        <p className="text-xs text-center text-warm-gray/50">AI 搭配效果</p>
        <div className="grid grid-cols-2 gap-2">
          {images.map((src, i) => (
            <div key={src} className="rounded-xl overflow-hidden bg-cream/30 aspect-[3/4]">
              <img
                src={src}
                alt={`搭配效果示例 ${i + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none"
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 底部：登录入口 */}
      <p className="mt-6 text-sm">
        {hasAccount ? (
          <button
            type="button"
            onClick={() => router.push("/scenes")}
            className="text-charcoal/70 hover:text-rose transition-colors"
          >
            欢迎回来，继续探索 →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/auth")}
            className="text-warm-gray/60 hover:text-rose transition-colors"
          >
            已有账号？登录
          </button>
        )}
      </p>
    </div>
  )
}
