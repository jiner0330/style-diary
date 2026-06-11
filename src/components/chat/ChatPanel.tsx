"use client"

import { useState, useRef, useEffect } from "react"
import { getItemById } from "@/lib/mock-data"
import { getAuthToken } from "@/lib/supabase"
import { useOutfitStore } from "@/store/outfit"
import type { OutfitState, AIOutfitPlan, AIOutfitItem, ClothingItem } from "@/types"
import toast from "react-hot-toast"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  rounds?: number
}

const CHAT_KEY = "sd-chat-msgs"

interface Props {
  currentOutfit: OutfitState
  onClose?: () => void
  onGenerateOutfit: () => void
  onGenerateFromAIItems?: (items: AIOutfitItem[]) => void
  onWearSet: (items: { slot: string; itemId: string }[]) => void
  userCoords?: { lat: number; lon: number } | null
  gender?: "female" | "male"
  bodyType?: string | null
  styleTags?: string[]
  autoFocus?: boolean
}

const QUICK_COMMANDS_FEMALE = [
  { label: "约会甜妹风", prompt: "帮我推荐一套适合约会的甜妹风穿搭" },
  { label: "通勤简约", prompt: "帮我推荐一套简约通勤穿搭" },
  { label: "帮我搭下装", prompt: "我现在上衣已经选好了，帮我推荐搭配的下装和鞋子" },
  { label: "评价这套", prompt: "帮我评价下当前这套搭配，有哪些可以改进的？" },
]

const QUICK_COMMANDS_MALE = [
  { label: "约会简约风", prompt: "帮我推荐一套适合约会的简约帅气穿搭" },
  { label: "通勤商务", prompt: "帮我推荐一套商务通勤穿搭" },
  { label: "帮我搭下装", prompt: "我现在上衣已经选好了，帮我推荐搭配的下装和鞋子" },
  { label: "评价这套", prompt: "帮我评价下当前这套搭配，有哪些可以改进的？" },
]

function extractJSONObjects(text: string): string[] {
  const results: string[] = []
  // Search for both "plan" and "items" markers
  const markers = [/\"plan\"\s*:\s*\d+/, /\"items\"\s*:\s*\[/]
  for (const markerRe of markers) {
    const re = new RegExp(markerRe.source, "g")
    let match
    while ((match = re.exec(text)) !== null) {
      // 向前找到最近的 {
      let start = match.index
      while (start > 0 && text[start] !== "{") start--
      if (text[start] !== "{") continue

      let depth = 0
      let i = start
      for (; i < text.length; i++) {
        if (text[i] === "{") depth++
        else if (text[i] === "}") {
          depth--
          if (depth === 0) break
        }
      }
      if (depth === 0 && i > match.index) results.push(text.slice(start, i + 1))
    }
  }
  return results
}

function parseAIOutfitPlans(text: string): AIOutfitPlan[] {
  const plans: AIOutfitPlan[] = []
  const seen = new Set<string>()

  // 1. 匹配 code block（```json 或 ``` 不带语言标签）
  const codeFenceRe = /```(?:\w+)?\s*\n?([\s\S]*?)```/g
  let match
  while ((match = codeFenceRe.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[1].trim())
      // Accept any JSON with items array (with or without "plan" key)
      if (obj.items && Array.isArray(obj.items)) {
        const key = JSON.stringify(obj.plan ?? match[1].trim().slice(0, 60))
        if (!seen.has(key)) {
          seen.add(key)
          plans.push(obj as AIOutfitPlan)
        }
      }
    } catch { /* skip malformed */ }
  }

  // 2. 兜底：从无 code fence 的文本中提取裸 JSON 对象（无论 code fence 解析到了几个）
  const candidates = extractJSONObjects(text)
  for (const candidate of candidates) {
    try {
      const obj = JSON.parse(candidate)
      if (obj.items && Array.isArray(obj.items)) {
        const key = JSON.stringify(obj.plan ?? candidate.slice(0, 60))
        if (!seen.has(key)) {
          seen.add(key)
          plans.push(obj as AIOutfitPlan)
        }
      }
    } catch { /* skip */ }
  }

  return plans
}

export default function ChatPanel({ currentOutfit, onClose, onGenerateOutfit, onGenerateFromAIItems, onWearSet, userCoords, gender, bodyType, styleTags, autoFocus }: Props) {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadStage, setLoadStage] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 本地消息状态 + localStorage 持久化
  const [messages, setMessages] = useState<ChatMessage[]>([])
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed)
      }
    } catch {}
  }, [])

  function addMessage(msg: ChatMessage) {
    setMessages((prev) => {
      const next = [...prev, msg]
      try { localStorage.setItem(CHAT_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const addAIItems = useOutfitStore((s) => s.addAIItems)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [autoFocus])

  /** UI 展示用的简短上下文 */
  function outfitContext(): string {
    const parts: string[] = []
    const slots = ["dress", "top", "bottom", "outerwear", "shoes", "bag"] as const
    const labels: Record<string, string> = {
      dress: "连衣裙", top: "上衣", bottom: "下装", outerwear: "外套", shoes: "鞋", bag: "包",
    }
    for (const slot of slots) {
      const id = currentOutfit[slot]
      if (id && typeof id === "string") {
        const item = getItemById(id) || useOutfitStore.getState().aiItemsCache[id]
        if (item) parts.push(`${labels[slot]}:${item.name}`)
      }
    }
    if (currentOutfit.accessories.length > 0) {
      const accNames = currentOutfit.accessories
        .map((id) => {
          const item = getItemById(id) || useOutfitStore.getState().aiItemsCache[id]
          return item?.name
        })
        .filter(Boolean)
      if (accNames.length > 0) parts.push(`配饰:${accNames.join("、")}`)
    }
    return parts.join(" · ")
  }

  /** 发给 AI 的完整单品描述（含颜色/材质/版型/风格/细节） */
  function describeOutfitForAI(): string | null {
    const lines: string[] = []
    const slots = ["dress", "top", "bottom", "outerwear", "shoes", "bag"] as const
    const labels: Record<string, string> = {
      dress: "连衣裙", top: "上衣", bottom: "下装", outerwear: "外套", shoes: "鞋", bag: "包",
    }
    for (const slot of slots) {
      const id = currentOutfit[slot]
      if (!id || typeof id !== "string") continue
      const item = getItemById(id) || useOutfitStore.getState().aiItemsCache[id]
      if (!item) continue
      const attrs: string[] = [item.name]
      if (item.color) attrs.push(`颜色${item.color}`)
      if (item.material) attrs.push(`${item.material}材质`)
      if (item.sub_category) attrs.push(`版型${item.sub_category}`)
      if (item.fit) attrs.push(`${item.fit}剪裁`)
      if (item.length) attrs.push(`长度${item.length}`)
      if (item.pattern) attrs.push(`图案${item.pattern}`)
      if (item.style_tags?.length) attrs.push(`风格${item.style_tags.join("、")}`)
      if (item.detail) attrs.push(`细节${item.detail}`)
      lines.push(`${labels[slot]}：${attrs.join(" | ")}`)
    }
    if (currentOutfit.accessories.length > 0) {
      const acc = currentOutfit.accessories
        .map((id) => {
          const item = getItemById(id) || useOutfitStore.getState().aiItemsCache[id]
          if (!item) return null
          return `${item.name}(风格:${item.style_tags?.join("、") || "无"})`
        })
        .filter(Boolean)
      if (acc.length > 0) lines.push(`配饰：${acc.join("、")}`)
    }
    return lines.length > 0 ? lines.join("\n") : null
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const userMsg: ChatMessage = { role: "user", content: text.trim() }
    addMessage(userMsg)
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

      const outfitDesc = describeOutfitForAI()

      const token = await getAuthToken()
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text.trim(), currentOutfit: outfitForAPI, outfitContext: outfitDesc, coords: userCoords, gender, bodyType, styleTags }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "请求失败")

      const assistantMsg: ChatMessage = { role: "assistant", content: data.content, rounds: data.rounds }
      ;(assistantMsg as any).plans = data.plans || []
      addMessage(assistantMsg)
    } catch (err: any) {
      addMessage({
        role: "assistant",
        content: `抱歉，搭配服务暂时出错了：${err.message}。请稍后重试～`,
      })
    } finally {
      setLoading(false)
      setLoadStage("")
      clearInterval(stageTimer)
    }
  }

  function handleQuickCommand(prompt: string) {
    sendMessage(prompt)
  }

  function handleWearAI(items: AIOutfitItem[]) {
    const ts = Date.now()
    const clothingItems: ClothingItem[] = []
    const wearItems: { slot: string; itemId: string }[] = []

    for (let i = 0; i < items.length; i++) {
      const ai = items[i]
      const id = `ai-${i}-${ai.slot}-${ts}`
      const item: ClothingItem = {
        id,
        owner_id: null,
        name: ai.name,
        category: ai.category as ClothingItem["category"],
        sub_category: ai.sub_category,
        color: ai.color,
        material: ai.material || null,
        pattern: null,
        fit: (ai.fit as ClothingItem["fit"]) || null,
        length: (ai.length as ClothingItem["length"]) || null,
        neckline: (ai.neckline as ClothingItem["neckline"]) || null,
        detail: ai.detail || null,
        style_tags: ai.style_tags,
        image_url: null,
        layer_order: 0,
        occupies_full_body: ai.category === "dress",
        source: "ai_recommended",
      }
      clothingItems.push(item)

      const slot = ai.slot === "accessories" ? "accessories" : ai.slot
      wearItems.push({ slot, itemId: id })
    }

    addAIItems(clothingItems)
    onWearSet(wearItems)
    toast.success("已穿上这套搭配")
  }

  function handleGenerateAI(items: AIOutfitItem[]) {
    if (onGenerateFromAIItems) {
      onGenerateFromAIItems(items)
    } else {
      // 回退：先穿上再触发旧版生图
      handleWearAI(items)
      setTimeout(() => onGenerateOutfit(), 100)
    }
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

      {/* 消息列表 — 仅在有消息或加载中时占空间 */}
      {(messages.length > 0 || loading) && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
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
                    plans={(msg as any).plans || parseAIOutfitPlans(msg.content)}
                    onGenerate={handleGenerateAI}
                    isLatest={i === messages.length - 1}
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
      )}

      {/* 输入卡片 — 无消息时垂直居中，有消息时贴在消息下方 */}
      <div className={`px-4 ${messages.length === 0 && !loading ? "flex-1 flex flex-col justify-center" : "flex-shrink-0 pt-2"}`}>
        <div className="rounded-2xl bg-cream/60 border border-warm-gray/15 px-4 py-4 space-y-3">
          {/* 欢迎提示（无消息时显示） */}
          {messages.length === 0 && (
            <div className="text-center">
              <p className="text-2xl mb-1">🦊</p>
              <p className="text-sm text-charcoal font-medium">我是你的搭配助手搭搭</p>
              <p className="text-[11px] text-warm-gray/60 leading-relaxed mt-0.5">
                告诉我你想穿什么风格、去什么场合<br />
                我帮你设计专属搭配方案 ✨
              </p>
            </div>
          )}

          {/* 快捷命令 */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {(gender === "male" ? QUICK_COMMANDS_MALE : QUICK_COMMANDS_FEMALE).map((cmd) => (
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

          {/* 输入区 */}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendMessage(input) }}
              placeholder="描述你的搭配需求..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-soft-white text-sm text-charcoal placeholder:text-warm-gray/40
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

      {/* 底部安全区 */}
      <div className="h-2 flex-shrink-0" />
    </div>
  )
}

function AssistantContent({
  text, plans, onGenerate, isLatest,
}: {
  text: string
  plans: AIOutfitPlan[]
  onGenerate: (items: AIOutfitItem[]) => void
  isLatest: boolean
}) {
  // 服务端已清理 JSON 代码块，客户端仅做防御性兜底
  let displayText = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/```/g, "")
  // 收集所有裸 JSON 对象后逆序移除，避免字符串突变导致索引错位
  const ranges: [number, number][] = []
  const markers = [/\"plan\"\s*:\s*\d+/, /\"items\"\s*:\s*\[/]
  for (const markerRe of markers) {
    const rawRe = new RegExp(markerRe.source, "g")
    let match
    while ((match = rawRe.exec(displayText)) !== null) {
      let start = match.index
      while (start > 0 && displayText[start] !== "{") start--
      if (displayText[start] !== "{") continue
      let depth = 0; let i = start
      for (; i < displayText.length; i++) {
        if (displayText[i] === "{") depth++
        else if (displayText[i] === "}") { depth--; if (depth === 0) break }
      }
      if (depth === 0 && i > match.index) ranges.push([start, i])
    }
  }
  for (let r = ranges.length - 1; r >= 0; r--) {
    displayText = displayText.slice(0, ranges[r][0]) + displayText.slice(ranges[r][1] + 1)
  }
  displayText = displayText.replace(/\n{3,}/g, "\n\n").trim()

  const html = displayText
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, '<span class="text-rose font-medium text-sm">$1</span>')
    .replace(/^## (.+)$/gm, '<span class="font-semibold text-sm">$1</span>')
    .replace(/^---$/gm, '<hr class="my-2 border-warm-gray/20" />')
    .replace(/\n/g, "<br/>")

  return (
    <div>
      {displayText && <div dangerouslySetInnerHTML={{ __html: html }} />}

      {plans.length > 0 && (
        <div className="mt-2 space-y-3">
          {plans.map((plan, pi) => (
            <PlanCard
              key={pi}
              plan={plan}
              onGenerate={() => onGenerate(plan.items)}
              showActions={isLatest}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PlanCard({
  plan, onGenerate, showActions,
}: {
  plan: AIOutfitPlan
  onGenerate: () => void
  showActions: boolean
}) {
  return (
    <div className="rounded-xl bg-soft-white/60 border border-warm-gray/15 p-3 space-y-2">
      {/* 头部：方案名 + 评分 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-charcoal">
          {plan.name}
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose/10 text-rose font-medium">
          {plan.score} 分
        </span>
      </div>

      {/* 理由 */}
      {plan.reason && (
        <p className="text-[11px] text-warm-gray/70 leading-relaxed">{plan.reason}</p>
      )}

      {/* 单品列表 */}
      <div className="flex flex-wrap gap-1">
        {plan.items.map((item, ii) => (
          <span
            key={ii}
            className="text-[10px] px-2 py-0.5 rounded-full bg-cream text-charcoal/70"
          >
            {item.name}
          </span>
        ))}
      </div>

      {/* 操作按钮 */}
      {showActions && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={onGenerate}
            className="text-[11px] px-3 py-1.5 rounded-full bg-charcoal/10 text-charcoal font-medium
                       active:scale-[0.97] transition-all hover:bg-charcoal/20"
          >
            ✨ 生成效果图
          </button>
        </div>
      )}
    </div>
  )
}
