"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, pointerWithin, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core"
import { supabase } from "@/lib/supabase"
import { useOutfitStore } from "@/store/outfit"
import { getItemById } from "@/lib/mock-data"
import WardrobePanel from "@/components/wardrobe/WardrobePanel"
import PersonalWardrobeBar from "@/components/wardrobe/PersonalWardrobeBar"
import ModelDisplay from "@/components/outfit/ModelDisplay"
import OutfitBar from "@/components/outfit/OutfitBar"
import ResultModal from "@/components/outfit/ResultModal"
import ChatPanel from "@/components/chat/ChatPanel"
import type { Scene, ClothingItem } from "@/types"
import toast from "react-hot-toast"

// 品类 → 自动路由到对应槽位，无需找热区
const CATEGORY_TO_SLOT: Record<string, string> = {
  dress: "dress",
  top: "top",
  bottom: "bottom",
  outerwear: "outerwear",
  shoes: "shoes",
  bag: "bag",
  accessory: "accessories",
}

function DressingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sceneId = searchParams.get("id")

  const [scene, setScene] = useState<Scene | null>(null)
  const [userGender, setUserGender] = useState<"female" | "male">("female")
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [angleIndex, setAngleIndex] = useState(0)
  const [generatingAngle, setGeneratingAngle] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [elapsed, setElapsed] = useState(0)
	const [showHistory, setShowHistory] = useState(false)
	const [wardrobeExpanded, setWardrobeExpanded] = useState(false)
	const [mobileTab, setMobileTab] = useState<"wardrobe" | "chat" | null>(null)
	const [mobilePanelHeight, setMobilePanelHeight] = useState<"half" | "full">("half")
	const panelDragY = useRef(0)
	const panelStartHeight = useRef<"half" | "full">("half")
  const [resultImages, setResultImages] = useState<Map<number, { url: string; prompt: string; promptZh?: string; mode?: string }>>(new Map())
  const [resultAngle, setResultAngle] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [reviewData, setReviewData] = useState<{ totalScore: number; dimensions: { label: string; score: number; icon: string }[]; comment: string } | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [activeDragItem, setActiveDragItem] = useState<{
    id: string
    name: string
    color: string
  } | null>(null)

  // 点击添加模式
  const [pendingCategory, setPendingCategory] = useState<string | null>(null)

  const outfit = useOutfitStore((s) => s.outfit)
  const setSlot = useOutfitStore((s) => s.setSlot)
  const addAccessory = useOutfitStore((s) => s.addAccessory)
  const clearAll = useOutfitStore((s) => s.clearAll)
  const undo = useOutfitStore((s) => s.undo)
  const history = useOutfitStore((s) => s.history)
  const addGenRecord = useOutfitStore((s) => s.addGenRecord)
  const generationHistory = useOutfitStore((s) => s.generationHistory)
  const saveOutfit = useOutfitStore((s) => s.saveOutfit)
  const savedOutfits = useOutfitStore((s) => s.savedOutfits)
  const deleteOutfit = useOutfitStore((s) => s.deleteOutfit)
  const loadOutfit = useOutfitStore((s) => s.loadOutfit)
  const wearSet = useOutfitStore((s) => s.wearSet)
  const initFromStorage = useOutfitStore((s) => s.initFromStorage)

  // 客户端初始化 localStorage
  useEffect(() => { initFromStorage() }, [initFromStorage])

  // 获取浏览器定位
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => console.log("[dressing] 定位未授权，跳过天气推荐"),
      { timeout: 5000, maximumAge: 30 * 60 * 1000 },
    )
  }, [])

  // 加载场景 + 用户性别
  useEffect(() => {
    async function load() {
      // 场景
      if (sceneId) {
        const { data: sceneData } = await supabase.from("scenes").select("*").eq("id", sceneId).single()
        if (sceneData) setScene(sceneData)
      }
      // 用户性别
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("user_profiles")
          .select("gender").eq("user_id", user.id).single()
        if (profile?.gender) setUserGender(profile.gender)
      }
    }
    load()
  }, [sceneId])

  // 拖拽开始：记录被拖单品
  function handleDragStart(event: DragStartEvent) {
    const itemData = event.active.data.current?.item
    if (itemData) {
      setActiveDragItem({
        id: itemData.id,
        name: itemData.name,
        color: itemData.color || "#C4A8A3",
      })
    }
  }

  // 拖拽结束：落在模特区域或外部
  function handleDragEnd(event: DragEndEvent) {
    setActiveDragItem(null)

    const { active, over } = event
    if (!over) return

    const itemData = active.data.current?.item
    if (!itemData) return

    // 只接受落在模特区（model-drop）的单品
    if (over.id !== "model-drop") return

    const category = itemData.category as string

    // 配饰特殊处理
    if (category === "accessory") {
      addAccessory(itemData.id)
      return
    }

    // 按品类自动路由到正确槽位
    const slot = CATEGORY_TO_SLOT[category] as "dress" | "top" | "bottom" | "outerwear" | "shoes" | "bag" | undefined
    if (!slot) return

    setSlot(slot, itemData.id)
  }

  // 点击空槽 → 进入点击添加模式
  function handleAddClick(category: string) {
    setPendingCategory(category)
    setDrawerOpen(true)
  }

  // 点击衣橱单品 → 直接添加到对应槽位
  function handleQuickAdd(item: ClothingItem) {
    const category = item.category
    if (category === "accessory") {
      addAccessory(item.id)
    } else {
      const slot = CATEGORY_TO_SLOT[category] as "dress" | "top" | "bottom" | "outerwear" | "shoes" | "bag" | undefined
      if (slot) setSlot(slot, item.id)
    }
    setPendingCategory(null)
    setDrawerOpen(false)
    setMobileTab(null)
    toast.success(`已添加 ${item.name}`)
  }

  // 计时器：生成中显示耗时 + 阶段切换
  useEffect(() => {
    if (generating) {
      setElapsed(0)
      setGenStage("connecting")
      elapsedRef.current = setInterval(() => {
        setElapsed((e) => {
          const next = e + 1
          if (next < 8) setGenStage("connecting")
          else if (next < 120) setGenStage("generating")
          else setGenStage("processing")
          return next
        })
      }, 1000)
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
      elapsedRef.current = null
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current) }
  }, [generating])

  // 收集搭配单品数据（直接从 store 读取，避免闭包 stale state）
  function collectItems() {
    const currentOutfit = useOutfitStore.getState().outfit
    const slots = ["dress", "top", "bottom", "outerwear", "shoes", "bag"] as const
    const items: { slot: string; name: string; color: string; category: string; material?: string; pattern?: string; sub_category?: string; detail?: string; style_tags?: string[]; image_url?: string }[] = []
    for (const slot of slots) {
      const id = currentOutfit[slot]
      if (id && typeof id === "string") {
        const item = getItemById(id)
        if (item) items.push({ slot, name: item.name, color: item.color, category: item.category, material: item.material ?? undefined, pattern: item.pattern ?? undefined, sub_category: item.sub_category ?? undefined, detail: item.detail ?? undefined, style_tags: item.style_tags ?? undefined, image_url: item.image_url ?? undefined })
      }
    }
    for (const accId of currentOutfit.accessories) {
      const acc = getItemById(accId)
      if (acc) items.push({ slot: "accessories", name: acc.name, color: acc.color, category: "accessory", material: acc.material ?? undefined, pattern: acc.pattern ?? undefined, sub_category: acc.sub_category ?? undefined, detail: acc.detail ?? undefined, style_tags: acc.style_tags ?? undefined, image_url: acc.image_url ?? undefined })
    }
    return items
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const [genStage, setGenStage] = useState<"connecting" | "generating" | "processing">("connecting")

  const hasAnyItem = !!outfit.dress || !!outfit.top || !!outfit.bottom || !!outfit.outerwear || !!outfit.shoes || !!outfit.bag || outfit.accessories.length > 0

  // 调用评价 API
  async function evaluateOutfit() {
    setReviewLoading(true)
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outfit, scene: scene?.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "评价失败")
      setReviewData(data)
    } catch (err: any) {
      console.warn("[evaluate] 评价失败:", err.message)
      // 评价失败不阻塞，静默处理
    } finally {
      setReviewLoading(false)
    }
  }

  // 为指定角度生成穿搭图
  async function generateForAngle(angleIdx: number) {
    const items = collectItems()
    if (items.length === 0) { toast.error("请先搭配至少一件单品"); return }

    if (resultImages.has(angleIdx)) {
      setResultAngle(angleIdx)
      setShowResult(true)
      return
    }

    setGenerating(true)
    setGenStage("connecting")
    setGeneratingAngle(angleIdx)
    setResultAngle(angleIdx)
    setShowResult(true)
    setReviewData(null)

    const startTime = Date.now()
    try {
      const res = await fetch("/api/generate-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender: userGender, items, angleIndex: angleIdx }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "生成失败")
      setResultImages((prev) => {
        const next = new Map(prev)
        next.set(angleIdx, { url: data.imageUrl, prompt: data.prompt, promptZh: data.promptZh, mode: data.mode })
        return next
      })
      // 保存生成记录
      addGenRecord({
        imageUrl: data.imageUrl,
        prompt: data.prompt,
        mode: data.mode || "unknown",
      })
      // 首张图生成后触发评价
      if (!reviewData && !reviewLoading) {
        evaluateOutfit()
      }
    } catch (err: any) {
      toast.error(err.message || "生成失败，请重试")
    } finally {
      setGenerating(false)
      setGeneratingAngle(null)
      setGenStage("connecting")
    }
  }

  // 完成搭配 → 生成当前角度
  async function handleCompleteOutfit() {
    const items = collectItems()
    if (items.length === 0) { toast.error("请先搭配至少一件单品"); return }
    await generateForAngle(angleIndex)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col flex-1 h-[100dvh]">
        {/* 顶部操作栏 */}
        <header className="flex items-center gap-3 px-4 py-3 bg-soft-white/90 backdrop-blur-sm border-b border-warm-gray/20">
          {/* 桌面端衣橱开关 */}
          <button
            onClick={() => setWardrobeExpanded(!wardrobeExpanded)}
            className={`hidden md:flex text-sm transition-colors ${
              wardrobeExpanded ? "text-rose" : "text-warm-gray hover:text-rose"
            }`}
            title={wardrobeExpanded ? "收起衣橱" : "打开衣橱"}
          >
            👗
          </button>
          <button
            onClick={() => router.back()}
            className="text-sm text-warm-gray hover:text-rose transition-colors"
          >
            ← 返回
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-sm font-medium text-charcoal">
              {scene?.name || "自由搭配"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* 保存当前搭配 */}
            <button
              onClick={() => {
                const hasItems = outfit.dress || outfit.top || outfit.bottom
                if (!hasItems) { toast.error("请先搭配至少一件单品"); return }
                const name = prompt("给这个搭配方案起个名字：", `搭配 ${new Date().toLocaleTimeString()}`)
                if (name) { saveOutfit(name); toast.success(`已保存「${name}」`) }
              }}
              className="text-[11px] px-3 py-1.5 rounded-full border border-warm-gray/30 text-warm-gray hover:text-rose hover:border-rose/30 transition-colors"
            >
              💾 保存
            </button>
            {/* 历史 */}
            <div className="relative">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                  showHistory ? "border-rose/40 text-rose" : "border-warm-gray/30 text-warm-gray"
                }`}
              >
                📋 记录 ({generationHistory.length + savedOutfits.length})
              </button>
              {showHistory && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowHistory(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-soft-white rounded-2xl shadow-xl border border-warm-gray/20 z-50 p-3">
                    {savedOutfits.length > 0 && (
                      <>
                        <p className="text-[10px] text-warm-gray/50 uppercase tracking-wide mb-2">保存的方案</p>
                        {savedOutfits.slice(0, 8).map((s) => (
                          <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-warm-gray/10 last:border-0">
                            <button
                              onClick={() => { loadOutfit(s.id); setShowHistory(false); toast.success(`已加载「${s.name}」`) }}
                              className="flex-1 text-left text-xs text-charcoal hover:text-rose transition-colors truncate"
                            >
                              {s.name}
                            </button>
                            <button
                              onClick={() => deleteOutfit(s.id)}
                              className="text-[10px] text-warm-gray/40 hover:text-red-400"
                            >
                              删除
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                    {generationHistory.length > 0 && (
                      <>
                        <p className="text-[10px] text-warm-gray/50 uppercase tracking-wide mb-2 mt-3">生成记录</p>
                        {generationHistory.slice(0, 6).map((g) => (
                          <div key={g.id} className="flex items-center gap-2 py-1.5 border-b border-warm-gray/10 last:border-0">
                            <img src={g.imageUrl} className="w-8 h-10 rounded-md object-cover" alt="" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-charcoal truncate">{new Date(g.createdAt).toLocaleString()}</p>
                              <p className="text-[9px] text-warm-gray/50">{g.mode === "edits" ? "图生图" : "文生图"}</p>
                            </div>
                            <a
                              href={g.imageUrl}
                              download
                              className="text-[10px] text-rose/60 hover:text-rose"
                            >
                              下载
                            </a>
                          </div>
                        ))}
                      </>
                    )}
                    {savedOutfits.length === 0 && generationHistory.length === 0 && (
                      <p className="text-xs text-warm-gray/50 text-center py-4">暂无记录</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* 主体三区布局 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左：衣橱面板 — 桌面端 */}
          {wardrobeExpanded && (
            <div className="hidden md:block md:w-[35%] lg:w-[30%] h-full overflow-hidden relative border-r border-warm-gray/20">
              <WardrobePanel
                pendingCategory={pendingCategory}
                onItemClick={handleQuickAdd}
                onUndo={undo}
                onClearAll={clearAll}
                hasHistory={history.length > 0}
              />
              <button
                onClick={() => setWardrobeExpanded(false)}
                className="absolute top-3 -right-3 z-10 w-6 h-6 rounded-full bg-rose/10 text-rose text-xs
                           flex items-center justify-center hover:bg-rose/20 transition-colors"
                title="收起衣橱"
              >
                ◀
              </button>
            </div>
          )}

          {/* 中：模特展示区 */}
          <div className="flex-1 flex flex-col items-center overflow-y-auto">
            <ModelDisplay gender={userGender} angleIndex={angleIndex} onAngleChange={setAngleIndex} />

            {/* 移动端：搭配清单卡片 */}
            <div className="md:hidden w-full">
              <OutfitBar compact onAddClick={handleAddClick} />
            </div>

            {/* 移动端：空态引导提示 */}
            {!hasAnyItem && (
              <div className="md:hidden text-center py-6 px-4">
                <p className="text-sm text-charcoal font-medium mb-1">开始搭配</p>
                <p className="text-xs text-warm-gray/50 leading-relaxed">
                  点击上方「点击添加」选择衣服<br />
                  搭配完成后点右下角按钮生成效果图
                </p>
              </div>
            )}

            {/* 移动端：浮动完成按钮 */}
            {hasAnyItem && !mobileTab && (
              <div className="md:hidden fixed bottom-20 right-4 z-30 flex flex-col items-center gap-1">
                <button
                  onClick={handleCompleteOutfit}
                  disabled={generating}
                  className="w-14 h-14 rounded-full bg-charcoal text-white shadow-xl
                             flex items-center justify-center text-xl
                             active:scale-95 transition-transform disabled:opacity-50
                             animate-pulse"
                >
                  {generating ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : "✨"}
                </button>
                <span className="text-[10px] text-charcoal/60 font-medium bg-soft-white/90 px-2 py-0.5 rounded-full shadow-sm">
                  完成搭配
                </span>
              </div>
            )}
          </div>

          {/* 右：搭搭聊天（桌面端常显） */}
          <div className="hidden lg:flex lg:w-[28%] h-full flex-col overflow-hidden border-l border-warm-gray/20">
            <ChatPanel
              currentOutfit={outfit}
              onGenerateOutfit={handleCompleteOutfit}
              onWearSet={wearSet}
              userCoords={userCoords}
            />
          </div>
        </div>

        {/* 桌面端：底部栏 — 个人衣橱 + 搭配清单 + 完成按钮 */}
        <div className="hidden md:block bg-soft-white/90 border-t border-warm-gray/20 px-6 pt-3">
          <PersonalWardrobeBar onItemClick={handleQuickAdd} />
          <div className="flex items-center justify-between gap-4 pb-4 pt-2">
            <div className="flex-1 overflow-x-auto">
              <OutfitBar />
            </div>
            <button
              onClick={handleCompleteOutfit}
              disabled={generating}
              className="flex-shrink-0 px-12 py-2.5 rounded-2xl bg-charcoal text-soft-white text-sm
                         font-medium tracking-wide active:scale-[0.98] transition-all
                         disabled:opacity-60 disabled:scale-100"
            >
              {generating ? "生成中..." : "完成搭配 ✨"}
            </button>
          </div>
        </div>

        {/* 移动端：衣橱底部抽屉 + 遮罩 */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 h-[50vh]">
              <WardrobePanel
                isDrawerOpen={drawerOpen}
                onClose={() => { setDrawerOpen(false); setPendingCategory(null) }}
                pendingCategory={pendingCategory}
                onItemClick={handleQuickAdd}
                onUndo={undo}
                onClearAll={clearAll}
                hasHistory={history.length > 0}
              />
            </div>
          </div>
        )}
      </div>

      {/* 拖拽预览（跟随光标的浮层） */}
      <DragOverlay>
        {activeDragItem ? (
          <div
            className="w-16 h-20 rounded-xl shadow-lg flex items-center justify-center
                       text-[9px] text-white font-medium opacity-90"
            style={{ backgroundColor: activeDragItem.color }}
          >
            {activeDragItem.name.slice(0, 4)}
          </div>
        ) : null}
      </DragOverlay>

      {/* AI 生成中 · 加载遮罩（首次生成，弹窗未开时） */}
      {generating && !showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-soft-white rounded-3xl px-8 py-8 shadow-2xl flex flex-col items-center gap-4 max-w-xs w-full">
            <div className="w-14 h-14 rounded-full border-[3px] border-warm-gray/15 border-t-rose animate-spin" />
            <p className="text-sm font-medium text-charcoal">AI 正在生成穿搭图...</p>
            <div className="flex gap-1.5">
              {(["connecting", "generating", "processing"] as const).map((stage) => {
                const active = genStage === stage
                const done = stage === "connecting" ? genStage !== "connecting" : stage === "generating" ? genStage === "processing" : false
                const label = stage === "connecting" ? "连接" : stage === "generating" ? "生成" : "处理"
                return (
                  <div
                    key={stage}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] transition-colors
                      ${active ? "bg-rose/10 text-rose" : done ? "bg-green-50 text-green-500" : "bg-warm-gray/10 text-warm-gray/40"}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-rose animate-pulse" : done ? "bg-green-400" : "bg-warm-gray/30"}`} />
                    {label}
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-warm-gray/60 text-center leading-relaxed">
              {genStage === "connecting" && "正在连接 AI 服务..."}
              {genStage === "generating" && "AI 正在根据搭配绘制效果图"}
              {genStage === "processing" && "图片处理中，请耐心等待..."}
              <br />
              已等待 {elapsed} 秒{elapsed > 90 ? "，大型图片生成较慢" : ""}
            </p>
          </div>
        </div>
      )}

      {/* 移动端：底部双 Tab 面板 */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40">
        {/* 面板内容 */}
        {mobileTab && (
          <div
            className={`bg-soft-white rounded-t-3xl shadow-2xl border-t border-warm-gray/15 overflow-hidden transition-all duration-300 ${
              mobilePanelHeight === "half" ? "h-[50vh]" : "h-[85vh]"
            }`}
          >
            {/* 拖拽手柄 */}
            <div
              className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => {
                panelDragY.current = e.clientY
                panelStartHeight.current = mobilePanelHeight
              }}
              onPointerMove={(e) => {
                if (e.buttons !== 1) return
                const dy = panelDragY.current - e.clientY
                if (Math.abs(dy) > 40) {
                  if (dy > 0 && mobilePanelHeight === "half") setMobilePanelHeight("full")
                  else if (dy < 0 && mobilePanelHeight === "full") setMobilePanelHeight("half")
                  panelDragY.current = e.clientY
                }
              }}
            >
              <div className="w-10 h-1 rounded-full bg-warm-gray/30" />
            </div>

            {mobileTab === "wardrobe" ? (
              <div className="h-full overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3">
                  <h3 className="text-sm font-medium text-charcoal">我的衣橱</h3>
                  <button onClick={() => setMobileTab(null)} className="text-warm-gray hover:text-rose text-sm">
                    收起
                  </button>
                </div>
                <PersonalWardrobeBar compact onItemClick={handleQuickAdd} />
                <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 gap-4">
                  <div className="w-16 h-16 rounded-full bg-rose/5 flex items-center justify-center">
                    <span className="text-2xl">📸</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-charcoal font-medium mb-1">打造你的专属衣橱</p>
                    <p className="text-xs text-warm-gray/50 leading-relaxed">
                      拍照或上传你的衣服照片<br />
                      搭搭就能根据你的真实衣橱做搭配
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-hidden">
                <ChatPanel
                  currentOutfit={outfit}
                  onClose={() => setMobileTab(null)}
                  onGenerateOutfit={handleCompleteOutfit}
                  onWearSet={(items) => {
                    wearSet(items)
                    setMobileTab(null)
                  }}
                  userCoords={userCoords}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 切换栏 */}
        <div className="flex items-center gap-2 px-4 py-2 bg-soft-white/95 backdrop-blur-sm border-t border-warm-gray/20">
          <button
            onClick={() => {
              if (mobileTab === "wardrobe") setMobileTab(null)
              else { setMobileTab("wardrobe"); setMobilePanelHeight("half") }
            }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-[background-color,color] active:scale-[0.98] ${
              mobileTab === "wardrobe"
                ? "bg-rose text-white"
                : "bg-cream text-charcoal"
            }`}
          >
            👤 我的衣橱
          </button>
          <button
            onClick={() => {
              if (mobileTab === "chat") setMobileTab(null)
              else { setMobileTab("chat"); setMobilePanelHeight("half") }
            }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-[background-color,color] active:scale-[0.98] ${
              mobileTab === "chat"
                ? "bg-charcoal text-white"
                : "bg-cream text-charcoal"
            }`}
          >
            ✨ 搭搭
          </button>
        </div>
      </div>

      {/* 移动端底部安全区占位 */}
      <div className="lg:hidden h-16" />

      {/* AI 生成结果弹窗 · 多角度 */}
      {showResult && (
        <ResultModal
          resultImages={resultImages}
          resultAngle={resultAngle}
          generatingAngle={generatingAngle}
          genStage={genStage}
          elapsed={elapsed}
          onAngleChange={(i) => {
            setResultAngle(i)
            if (!resultImages.has(i) && generatingAngle === null) {
              generateForAngle(i)
            }
          }}
          onClose={() => { setShowResult(false); setResultImages(new Map()); setGeneratingAngle(null); setReviewData(null) }}
          reviewData={reviewData}
          reviewLoading={reviewLoading}
          onSave={() => {
            const hasItems = outfit.dress || outfit.top || outfit.bottom
            if (!hasItems) { toast.error("请先搭配至少一件单品"); return }
            const name = prompt("给这个方案起个名字：")
            if (name) { saveOutfit(name); toast.success(`已保存「${name}」`) }
          }}
        />
      )}
    </DndContext>
  )
}

// 用 Suspense 包裹 useSearchParams
export default function DressingPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <p className="text-warm-gray animate-pulse">正在准备搭配间...</p>
      </div>
    }>
      <DressingContent />
    </Suspense>
  )
}
