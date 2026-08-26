"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { getAuthToken } from "@/lib/supabase"
import { saveGuestItem } from "@/hooks/usePersonalWardrobe"
import toast from "react-hot-toast"

export default function Home() {
  const router = useRouter()
  const [images, setImages] = useState<string[]>([])
  const [hasAccount, setHasAccount] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // 上传 1 件衣服 → AI 识别 → 游客存本地衣橱 → 进自由搭配
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const token = await getAuthToken()
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/wardrobe", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.item) {
        if (!token) saveGuestItem(data.item)
        router.push("/wardrobe")
      } else {
        toast.error(data.error || "上传失败，请重试")
      }
    } catch {
      toast.error("上传失败，请重试")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center px-6 py-10">
      {/* Hero */}
      <div className="flex flex-col items-center gap-1 mb-8">
        <h1 className="text-3xl font-semibold tracking-[0.2em] text-charcoal">搭搭</h1>
        <p className="text-[15px] text-charcoal/70 font-medium mt-2">把你衣柜里的衣服，搭出好方案</p>
        <p className="text-[13px] text-warm-gray">约会 · 通勤 · 日常，基于你真实衣橱的智能搭配</p>
      </div>

      {/* 主 CTA：上传衣服（先体验，不登录） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full max-w-xs py-4 rounded-2xl bg-rose text-soft-white text-base font-medium
                   shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-150 disabled:opacity-60"
        style={{ touchAction: "manipulation" }}
      >
        {uploading ? "识别中..." : "📷 上传 1 件衣服，看 AI 怎么搭"}
      </button>

      {/* 效果图展示 */}
      <div className="w-full max-w-xs mt-8 space-y-2.5">
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

      {/* 次要入口：场景下沉 */}
      <button
        type="button"
        onClick={() => router.push("/scenes")}
        className="mt-6 text-[14px] text-charcoal/60 hover:text-rose transition-colors"
        style={{ touchAction: "manipulation" }}
      >
        换个场景试试 →
      </button>

      {/* 底部 */}
      <p className="mt-6 text-[13px]">
        {hasAccount ? (
          <button
            type="button"
            onClick={() => router.push("/scenes")}
            className="text-charcoal/50 hover:text-rose transition-colors"
            style={{ touchAction: "manipulation" }}
          >
            欢迎回来，继续探索 →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/auth")}
            className="text-warm-gray/40 hover:text-rose transition-colors"
            style={{ touchAction: "manipulation" }}
          >
            已有账号？登录
          </button>
        )}
      </p>
    </div>
  )
}
