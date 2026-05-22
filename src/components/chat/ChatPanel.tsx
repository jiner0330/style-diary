"use client"

import { useState, useRef, useEffect } from "react"
import { getItemById } from "@/lib/mock-data"
import { getAuthToken } from "@/lib/supabase"
import type { OutfitState } from "@/types"

interface Message {
  role: "user" | "assistant"
  content: string
  rounds?: number
}

interface Props {
  currentOutfit: OutfitState
  onClose?: () => void
  onGenerateOutfit: () => void
  onWearSet: (items: { slot: string; itemId: string }[]) => void
}

const QUICK_COMMANDS = [
  { label: "约会甜妹风", prompt: "帮我推荐一套适合约会的甜妹风穿搭" },
  { label: "通勤简约", prompt: "帮我推荐一套简约通勤穿搭" },
  { label: "帮我搭下装", prompt: "我现在上衣已经选好了，帮我推荐搭配的下装和鞋子" },
  { label: "评价这套", prompt: "帮我评价下当前这套搭配，有哪些可以改进的？" },
]

function hasOutfitScheme(text: string): boolean {
  return /方案[一二三四五]/.test(text) && parseItemIds(text).length > 0
}

// 解析 AI 回复中的单品 ID（格式: #top-04 或 #top-uuid）
function parseItemIds(text: string): { slot: string; itemId: string }[] {
  const idPattern = /#(top|bottom|dress|outerwear|shoes|bag|acc)-([\w-]+)/g
  const seen = new Set<string>()
  const result: { slot: string; itemId: string }[] = []
  for (const match of text.matchAll(idPattern)) {
    const rawId = match[2]
    const fullId = `${match[1]}-${rawId}`
    if (seen.has(fullId)) continue
    seen.add(fullId)
    const item = getItemById(fullId)
    if (item) {
      const slot = item.category === "accessory" ? "accessories" : item.category
      result.push({ slot, itemId: fullId })
    }
  }
  return result
}

export default function ChatPanel({ currentOutfit, onClose, onGenerateOutfit, onWearSet }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadStage, setLoadStage] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autoGenRef = useRef(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  // 当最后一条 AI 消息包含搭配方案时，自动穿戴并生图
  useEffect(() => {
    if (autoGenRef.current) return
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== "assistant") return
    if (!hasOutfitScheme(lastMsg.content)) return

    autoGenRef.current = true
    handleWearScheme(lastMsg.content)
    // 延迟让 store 更新生效后触发生图
    setTimeout(() => onGenerateOutfit(), 100)
  }, [messages])

  // 新消息发送时重置 auto-gen 标记
  useEffect(() => {
    if (loading) autoGenRef.current = false
  }, [loading])

  function outfitContext(): string {
    const parts: string[] = []
    const slots = ["dress", "top", "bottom", "outerwear", "shoes", "bag"] as const
    const labels: Record<string, string> = {
      dress: "连衣裙", top: "上衣", bottom: "下装", outerwear: "外套", shoes: "鞋", bag: "包",
    }
    for (const slot of slots) {
      const id = currentOutfit[slot]
      if (id && typeof id === "string") {
        const item = getItemById(id)
        if (item) parts.push(`${labels[slot]}:${item.name}`)
      }
    }
    if (currentOutfit.accessories.length > 0) {
      const accNames = currentOutfit.accessories
        .map((id) => getItemById(id)?.name)
        .filter(Boolean)
      if (accNames.length > 0) parts.push(`配饰:${accNames.join("、")}`)
    }
    return parts.join(" · ")
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: "user", content: text.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    const stageTimer = setInterval(() => {
      setLoadStage((s) => {
        if (!s || s === "connecting") return "generating"
        if (s === "generating") return "processing"
        return s
      })
    }, 3000)

    try {
      const outfitForAPI: Record<string, unknown> = {
        dress: currentOutfit.dress,
        top: currentOutfit.top,
        bottom: currentOutfit.bottom,
        outerwear: currentOutfit.outerwear,
        shoes: currentOutfit.shoes,
        bag: currentOutfit.bag,
        accessories: currentOutfit.accessories,
      }
      console.log("[ChatPanel] sending outfit:", JSON.stringify(outfitForAPI))

      const token = await getAuthToken()
      console.log("[ChatPanel] token present:", !!token)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text.trim(), currentOutfit: outfitForAPI }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "请求失败")

      const assistantMsg: Message = { role: "assistant", content: data.content, rounds: data.rounds }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `抱歉，搭配服务暂时出错了：${err.message}。请稍后重试～`,
      }])
    } finally {
      setLoading(false)
      setLoadStage("")
      clearInterval(stageTimer)
    }
  }

  function handleQuickCommand(prompt: string) {
    sendMessage(prompt)
  }

  function handleWearScheme(text: string) {
    const items = parseItemIds(text)
    if (items.length === 0) return
    // 每个 slot 取首次出现（方案一优先），accessories 合并
    const slotMap = new Map<string, string>()
    const accItems: string[] = []
    for (const { slot, itemId } of items) {
      if (slot === "accessories") {
        if (!accItems.includes(itemId)) accItems.push(itemId)
      } else {
        if (!slotMap.has(slot)) slotMap.set(slot, itemId)
      }
    }
    const wearItems = [...slotMap.entries()].map(([slot, itemId]) => ({ slot, itemId }))
    for (const itemId of accItems) {
      wearItems.push({ slot: "accessories", itemId })
    }
    onWearSet(wearItems)
  }

  const context = outfitContext()
  const hasOutfit = context.length > 0

  return (
    <div className="flex flex-col h-full bg-soft-white">
      {/* 顶部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-gray/15">
        <div>
          <p className="text-sm font-medium text-charcoal">搭搭</p>
          <p className="text-[10px] text-warm-gray/50">AI 搭配助手</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-warm-gray/10 text-warm-gray hover:bg-warm-gray/20 transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {/* 当前搭配上下文 */}
      {hasOutfit && (
        <div className="px-4 py-2.5 bg-rose/5 border-b border-rose/10">
          <p className="text-[10px] text-rose/60 mb-1">当前搭配</p>
          <p className="text-xs text-charcoal leading-relaxed">{context}</p>
        </div>
      )}

      {/* 消息列表 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-3xl mb-3">🦊</p>
            <p className="text-sm text-charcoal font-medium mb-1">我是你的搭配助手搭搭</p>
            <p className="text-xs text-warm-gray/50 leading-relaxed">
              告诉我你想穿什么风格、去什么场合<br />
              我帮你从衣橱里挑出最适合的搭配 🦊
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-charcoal text-soft-white rounded-br-md"
                  : "bg-cream text-charcoal rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <AssistantContent
                  text={msg.content}
                  onWear={() => handleWearScheme(msg.content)}
                  showActions={parseItemIds(msg.content).length > 0 && i === messages.length - 1}
                />
              ) : (
                msg.content
              )}
              {msg.rounds && (
                <p className="text-[9px] text-warm-gray/40 mt-1">思考 {msg.rounds} 轮</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-cream rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-rose/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-rose/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-warm-gray/60">
                  {!loadStage && "连接中..."}
                  {loadStage === "connecting" && "正在查看你的衣柜..."}
                  {loadStage === "generating" && "正在搭配中..."}
                  {loadStage === "processing" && "整理方案中..."}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 快捷命令 */}
      <div className="px-4 py-2 border-t border-warm-gray/10 flex flex-wrap gap-1.5">
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd.label}
            onClick={() => handleQuickCommand(cmd.prompt)}
            disabled={loading}
            className="text-[10px] px-2.5 py-1.5 rounded-full border border-warm-gray/20 text-warm-gray/70
                       hover:border-rose/30 hover:text-rose hover:bg-rose/5 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cmd.label}
          </button>
        ))}
      </div>

      {/* 生图入口：有搭配时常显 */}
      {hasOutfit && (
        <div className="px-4 pt-2 pb-1">
          <button
            onClick={onGenerateOutfit}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-charcoal text-soft-white text-sm font-medium
                       active:scale-[0.98] transition-all hover:bg-charcoal/90 disabled:opacity-50"
          >
            ✨ 生成效果图
          </button>
        </div>
      )}

      {/* 输入区 */}
      <div className="px-4 py-3 border-t border-warm-gray/15">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(input) }}
            placeholder="描述你的搭配需求..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-cream text-sm text-charcoal placeholder:text-warm-gray/40
                       outline-none focus:ring-2 focus:ring-rose/20 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-charcoal text-soft-white text-sm font-medium
                       hover:bg-charcoal/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}

function AssistantContent({
  text, onWear, showActions,
}: {
  text: string
  onWear: () => void
  showActions: boolean
}) {
  const html = text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, '<span class="text-rose font-medium">$1</span>')
    .replace(/^## (.+)$/gm, '<span class="font-semibold text-sm">$1</span>')
    .replace(/^---$/gm, '<hr class="my-2 border-warm-gray/20" />')
    .replace(/\n/g, "<br/>")

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {showActions && (
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={onWear}
            className="text-[11px] px-3 py-1.5 rounded-full bg-rose/10 text-rose font-medium
                       active:scale-[0.97] transition-all hover:bg-rose/20"
          >
            👗 穿上这套
          </button>
        </div>
      )}
    </div>
  )
}
