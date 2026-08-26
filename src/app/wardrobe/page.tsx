"use client"

import { useRef, useState } from "react"
import { usePersonalWardrobe, saveGuestItem } from "@/hooks/usePersonalWardrobe"
import { getAuthToken } from "@/lib/supabase"
import type { ClothingItem } from "@/types"
import toast from "react-hot-toast"

// 品类分组（顺序 + 中文名）
const CATEGORY_ORDER = ["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory"] as const
const CATEGORY_LABELS: Record<string, string> = {
  top: "上衣", bottom: "下装", dress: "连衣裙",
  outerwear: "外套", shoes: "鞋", bag: "包", accessory: "配饰",
}

interface Plan {
  plan?: number
  name?: string
  score?: number
  reason?: string
  items?: Array<{ name?: string; category?: string; color?: string; style_tags?: string[] }>
}

export default function WardrobePage() {
  const { items, loading, refresh } = usePersonalWardrobe()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [input, setInput] = useState("")
  const [asking, setAsking] = useState(false)
  const [reply, setReply] = useState<{ content: string; plans: Plan[] } | null>(null)
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

  async function ask() {
    const text = input.trim()
    if (!text || asking) return
    setAsking(true)
    setReply(null)
    try {
      const token = await getAuthToken()
      const selectedItems = items.filter((i) => selected.has(i.id))
      const selectedItemsDetail = selectedItems.length > 0
        ? selectedItems.map((i) => `${i.name}（${i.category}，${i.sub_category || ""}，${i.color}，${i.material || ""}）`).join("；")
        : ""
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: token
          ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
          : { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          selectedItemsDetail,
          wardrobeItems: items,
          gender: "female",
          bodyType: null,
          styleTags: [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "请求失败")
      setReply({ content: data.content || "", plans: data.plans || [] })
    } catch (e: any) {
      toast.error(e.message || "请求失败，请稍后重试")
    } finally {
      setAsking(false)
    }
  }

  const groups = CATEGORY_ORDER
    .map((cat) => ({ cat, label: CATEGORY_LABELS[cat], list: items.filter((i) => i.category === cat) }))
    .filter((g) => g.list.length > 0)

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-warm-gray animate-pulse">正在加载衣橱...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      {/* 顶部 */}
      <div className="flex items-center justify-between px-5 pt-6 pb-1">
        <h1 className="text-xl font-semibold text-charcoal tracking-wider">我的衣橱</h1>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
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
      <p className="text-xs text-warm-gray px-5 mb-4">勾选要搭的单品</p>

      {/* 滚动内容：空状态 / 品类分组 / 回复 */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
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
          <>
            {/* 搭搭回复 */}
            {reply && <ReplySection reply={reply} />}

            {/* 按品类分组 */}
            {groups.map((g) => (
              <div key={g.cat} className="mb-4">
                <h2 className="text-sm font-medium text-charcoal/70 mb-2">{g.label}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {g.list.map((item) => (
                    <WardrobeGridItem
                      key={item.id}
                      item={item}
                      selected={selected.has(item.id)}
                      onToggle={() => toggleSelect(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 底部常驻输入框 */}
      <div className="px-5 py-3 border-t border-warm-gray/20 bg-soft-white/60">
        <div className="flex gap-2 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") ask() }}
            placeholder={selected.size > 0 ? `已选 ${selected.size} 件，描述你的搭配需求…` : "描述你的搭配需求…"}
            className="flex-1 px-4 py-2.5 rounded-full bg-white border border-warm-gray/30 text-sm text-charcoal placeholder:text-warm-gray/60 focus:outline-none focus:border-rose/40"
          />
          <button
            type="button"
            onClick={ask}
            disabled={asking || !input.trim()}
            className="w-9 h-9 rounded-full bg-rose text-soft-white flex items-center justify-center disabled:opacity-50"
            style={{ touchAction: "manipulation" }}
          >
            {asking ? "…" : "↑"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReplySection({ reply }: { reply: { content: string; plans: Plan[] } }) {
  return (
    <div className="mb-4 space-y-3">
      {reply.content && <p className="text-sm text-charcoal/80 whitespace-pre-wrap">{reply.content}</p>}
      {reply.plans.map((p, i) => (
        <div key={i} className="rounded-xl bg-white border border-rose/20 p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-charcoal">{p.name || `方案${(p.plan || i) + 1}`}</h3>
            {p.score != null && <span className="text-xs text-rose font-medium">{p.score} 分</span>}
          </div>
          {p.reason && <p className="text-xs text-warm-gray mb-2">{p.reason}</p>}
          <div className="flex flex-wrap gap-1.5">
            {p.items?.map((it, j) => (
              <span key={j} className="text-[11px] px-2 py-1 rounded-full bg-cream/60 text-charcoal/70">
                {it.name || it.category}
              </span>
            ))}
          </div>
        </div>
      ))}
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
