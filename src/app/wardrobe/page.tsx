"use client"

import { useRef, useState } from "react"
import { usePersonalWardrobe, saveGuestItem } from "@/hooks/usePersonalWardrobe"
import { getAuthToken } from "@/lib/supabase"
import type { ClothingItem } from "@/types"
import toast from "react-hot-toast"

export default function WardrobePage() {
  const { items, loading, refresh } = usePersonalWardrobe()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
        refresh()
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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-warm-gray animate-pulse">正在加载衣橱...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 px-5 py-6">
      {/* 顶部：标题 + 上传 */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-charcoal tracking-wider">我的衣橱</h1>
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
          className="px-4 py-2 rounded-xl bg-rose text-soft-white text-sm font-medium disabled:opacity-60"
          style={{ touchAction: "manipulation" }}
        >
          {uploading ? "上传中..." : "📷 上传"}
        </button>
      </div>
      <p className="text-xs text-warm-gray mb-4">勾选要搭的单品</p>

      {items.length === 0 ? (
        /* 空状态引导 */
        <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16">
          <p className="text-3xl">👕</p>
          <p className="text-sm text-charcoal/70">你的衣橱还是空的</p>
          <p className="text-xs text-warm-gray">上传第一件衣服，让搭搭帮你搭</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-1 px-5 py-2.5 rounded-xl bg-rose text-soft-white text-sm font-medium"
            style={{ touchAction: "manipulation" }}
          >
            上传第一件衣服
          </button>
        </div>
      ) : (
        /* 2 列网格 */
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <WardrobeGridItem
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggle={() => toggleSelect(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function WardrobeGridItem({ item, selected, onToggle }: { item: ClothingItem; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative rounded-xl overflow-hidden bg-white/60 border-2 aspect-[3/4] transition-colors ${selected ? "border-rose" : "border-warm-gray/20"}`}
      style={{ touchAction: "manipulation" }}
    >
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" draggable={false} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-warm-gray/50 text-sm">{item.name.slice(0, 3)}</div>
      )}
      {selected && (
        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose text-soft-white flex items-center justify-center text-sm">✓</span>
      )}
      <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent text-soft-white text-xs px-2 py-1 text-left truncate">
        {item.name}
      </span>
    </button>
  )
}
