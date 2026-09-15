"use client"

import { useEffect, useRef, useState } from "react"
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
  items?: Array<{ name?: string; category?: string; color?: string; style_tags?: string[]; source?: string; ref?: string }>
}

interface Msg {
  role: "user" | "assistant"
  content: string
  plans?: Plan[]
  selectedItems?: ClothingItem[]
}

export default function WardrobePage() {
  const { items, loading, refresh } = usePersonalWardrobe()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [input, setInput] = useState("")
  const [asking, setAsking] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [view, setView] = useState<"wardrobe" | "chat">("wardrobe")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 新消息 / 加载中时自动滚到底部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, asking])

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
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setInput("")
    setView("chat")
    try {
      const token = await getAuthToken()
      const selectedItems = items.filter((i) => selected.has(i.id))
      const selectedItemsDetail = selectedItems.length > 0
        ? selectedItems.map((i, idx) => `单品${idx + 1}：${i.name}（${i.category}，${i.sub_category || ""}，${i.color}，${i.material || ""}）`).join("；")
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
      setMessages((prev) => [...prev, { role: "assistant", content: data.content || "", plans: data.plans || [], selectedItems }])
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `抱歉，搭配服务暂时出错了：${e.message}。请稍后重试～` }])
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
    <>
      {view === "wardrobe" ? (
        /* ── 衣橱视图：选单品 ── */
        <div className="flex flex-col flex-1 px-5 pt-6 pb-24">
          <div className="flex items-center justify-between pb-1">
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
          <p className="text-xs text-warm-gray mb-4">勾选要搭的单品</p>

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
      ) : (
        /* ── 对话视图：问搭搭 ── */
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-warm-gray/15 bg-soft-white">
            <button
              type="button"
              onClick={() => setView("wardrobe")}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-warm-gray/10 text-charcoal text-lg"
              style={{ touchAction: "manipulation" }}
              aria-label="返回衣橱"
            >
              ←
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-charcoal">搭搭</p>
              <p className="text-[10px] text-warm-gray/50">AI 搭配助手</p>
            </div>
            {selected.size > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose/10 text-rose font-medium">
                已选 {selected.size} 件
              </span>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 pb-24">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    m.role === "user"
                      ? "bg-charcoal text-soft-white rounded-br-md"
                      : "bg-cream text-charcoal rounded-bl-md"
                  }`}
                >
                  {m.role === "assistant" ? <AssistantBubble msg={m} wardrobeItems={items} /> : m.content}
                </div>
              </div>
            ))}

            {asking && (
              <div className="flex justify-start">
                <div className="bg-cream rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-rose/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-rose/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs text-warm-gray/60">正在搭配中...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 固定底部输入框（两视图共用） */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-5 py-3 border-t border-warm-gray/20 bg-soft-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex gap-2 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") ask() }}
            placeholder={
              view === "chat"
                ? "继续和搭搭聊…"
                : selected.size > 0 ? `已选 ${selected.size} 件，描述你的搭配需求…` : "描述你的搭配需求…"
            }
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
    </>
  )
}

function AssistantBubble({ msg, wardrobeItems }: { msg: Msg; wardrobeItems: ClothingItem[] }) {
  return (
    <div>
      {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
      {msg.plans?.map((p, i) => (
        <div key={i} className="mt-2 rounded-xl bg-soft-white border border-rose/20 p-3">
          <h3 className="text-sm font-semibold text-charcoal mb-1">{p.name || `方案${(p.plan || i) + 1}`}</h3>
          {p.reason && <p className="text-xs text-warm-gray mb-2">{p.reason}</p>}

          {/* 单品：你的（有图）vs 建议补充（文字虚线框） */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {p.items?.map((it, j) => {
              const isUser = it.source === "user"
              const img = isUser ? matchItemImage(it, msg.selectedItems || [], wardrobeItems) : undefined
              return (
                <div
                  key={j}
                  className={`rounded-lg overflow-hidden border ${isUser ? "border-rose/30 bg-cream/40" : "border-dashed border-warm-gray/40 bg-white"}`}
                >
                  {img ? (
                    <div className="aspect-square">
                      <img src={img} alt={it.name} className="w-full h-full object-cover" draggable={false} />
                    </div>
                  ) : (
                    <div className="aspect-square flex items-center justify-center text-[10px] text-warm-gray/70 text-center px-1 leading-tight">
                      {it.name}
                    </div>
                  )}
                  <div className="px-1.5 py-1">
                    <p className="text-[10px] text-charcoal/80 truncate">{it.name}</p>
                    <p className={`text-[9px] font-medium ${isUser ? "text-rose" : "text-warm-gray"}`}>
                      {isUser ? "你的" : "建议补充"}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 占位条：效果图生成中（异步生图 P1 补上） */}
          <div className="rounded-lg border border-dashed border-rose/30 bg-rose/5 px-3 py-2.5 flex items-center justify-between">
            <span className="text-[11px] text-rose font-medium">效果图生成中…</span>
            <span className="text-[10px] text-warm-gray">预计 1 分钟</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function matchItemImage(
  it: { name?: string; category?: string; color?: string; ref?: string },
  selectedItems: ClothingItem[],
  wardrobe: ClothingItem[],
): string | undefined {
  // 1. ref 精准匹配：单品N → 勾选快照的第 N-1 件
  if (it.ref) {
    const m = it.ref.match(/\d+/)
    if (m) {
      const idx = parseInt(m[0], 10) - 1
      const url = selectedItems[idx]?.image_url
      if (url) return url
    }
  }
  // 2. 品类 + 颜色(hex) 兜底（勾选快照内）
  const byCatColor = selectedItems.find(
    (w) => w.category === it.category && w.color?.toUpperCase() === (it.color || "").toUpperCase(),
  )
  if (byCatColor?.image_url) return byCatColor.image_url
  // 3. 名字匹配兜底（全衣橱）
  const name = it.name || ""
  if (!name || wardrobe.length === 0) return undefined
  const exact = wardrobe.find((w) => w.name === name)
  if (exact?.image_url) return exact.image_url
  const fuzzy = wardrobe.find((w) => name.includes(w.name) || w.name.includes(name))
  return fuzzy?.image_url ?? undefined
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
