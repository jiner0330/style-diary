"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import { motion } from "framer-motion"
import { useSearchParams, useRouter } from "next/navigation"
import { DndContext } from "@dnd-kit/core"
import { supabase, getAuthToken } from "@/lib/supabase"
import { useOutfitStore } from "@/store/outfit"
import { getItemById } from "@/lib/mock-data"
import { getCachedWardrobeItem, getCachedWardrobeItems } from "@/hooks/usePersonalWardrobe"
import { enrichScene } from "@/lib/scene-assets"
import { track } from "@/lib/analytics"
import WardrobePanel from "@/components/wardrobe/WardrobePanel"
import PersonalWardrobeBar from "@/components/wardrobe/PersonalWardrobeBar"
import ModelDisplay from "@/components/outfit/ModelDisplay"
import OutfitBar from "@/components/outfit/OutfitBar"
import ResultModal from "@/components/outfit/ResultModal"
import GenerationBar from "@/components/outfit/GenerationBar"
import ChatPanel from "@/components/chat/ChatPanel"
import AmbientSound from "@/components/scene/AmbientSound"
import SceneParticles from "@/components/scene/SceneParticles"
import StylistRemark from "@/components/scene/StylistRemark"
import { type RemarkWeather } from "@/lib/stylist-remark"
import type { Scene, ClothingItem, AIOutfitItem } from "@/types"
import toast from "react-hot-toast"

// UI 角度索引 → API 角度索引（0=正面，2=背面，跳过3/4侧）
function toApiAngle(uiIndex: number): number {
  return uiIndex === 0 ? 0 : 2
}

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
  const [userGender, setUserGender] = useState<"female" | "male">()
  const [profileLoading, setProfileLoading] = useState(true)
  const [userBodyType, setUserBodyType] = useState<string | null>(null)
  const [userStyleTags, setUserStyleTags] = useState<string[]>([])
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [angleIndex, setAngleIndex] = useState(0)
  const [generatingAngle, setGeneratingAngle] = useState<number | null>(null)
  const generatingAngleRef = useRef<number | null>(null)
  const [genStatus, setGenStatus] = useState<"idle" | "generating" | "done" | "error" | null>(null)
  const [genTaskId, setGenTaskId] = useState<number | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
	const [showHistory, setShowHistory] = useState(false)
	const [desktopPanel, setDesktopPanel] = useState<"wardrobe" | "chat" | null>(null)
	const [mobileTab, setMobileTab] = useState<"wardrobe" | "chat" | null>(null)
	const [mobilePanelHeight, setMobilePanelHeight] = useState<"half" | "full">("half")
	const [saveDialogOpen, setSaveDialogOpen] = useState(false)
	const [saveNameValue, setSaveNameValue] = useState("")
	const saveInputRef = useRef<HTMLInputElement | null>(null)
	const [guestRemaining, setGuestRemaining] = useState(3)
	const [isGuest, setIsGuest] = useState(false)
	const [guestSaveDialogOpen, setGuestSaveDialogOpen] = useState(false)
	const guestSavePendingName = useRef("")
	const panelDragY = useRef(0)
	const panelStartHeight = useRef<"half" | "full">("half")
  const [resultImages, setResultImages] = useState<Map<number, { url: string; prompt: string; promptZh?: string; mode?: string }>>(new Map())
  const [resultAngle, setResultAngle] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [shareCloseTrigger, setShareCloseTrigger] = useState(0)
  const [reviewData, setReviewData] = useState<{ totalScore: number; dimensions: { label: string; score: number; icon: string }[]; comment: string } | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // 点击添加模式
  const [pendingCategory, setPendingCategory] = useState<string | null>(null)
  // 浮动完成按钮可拖动 — 用 transform GPU 合成，不触发布局
  const [btnOffset, setBtnOffset] = useState({ tx: 0, ty: 0 })
  const btnRef = useRef<HTMLDivElement | null>(null)
  const btnDragging = useRef(false)
  const btnDrag = useRef({ startX: 0, startY: 0, startTX: 0, startTY: 0, moved: false })

  const outfit = useOutfitStore((s) => s.outfit)
  // 搭配变更时清除旧图片缓存并中止进行中的生图任务
  useEffect(() => {
    setResultImages(new Map())
    setGenTaskId(null)
    setGenStatus("idle")
    setGeneratingAngle(null)
    generatingAngleRef.current = null
    setReviewData(null)
    // 穿 AI 套 → 保留 AI 标记（不评分）；用户手动改动 → 重置为 DIY（评分）
    generatedByAI.current = wearingAISetRef.current
    wearingAISetRef.current = false
  }, [outfit])
  const setSlot = useOutfitStore((s) => s.setSlot)
  const addAccessory = useOutfitStore((s) => s.addAccessory)
  const clearAll = useOutfitStore((s) => s.clearAll)
  const undo = useOutfitStore((s) => s.undo)
  const history = useOutfitStore((s) => s.history)
  const addGenRecord = useOutfitStore((s) => s.addGenRecord)
  const generationHistory = useOutfitStore((s) => s.generationHistory)
  const saveOutfitLocal = useOutfitStore((s) => s.saveOutfit)
  const savedOutfits = useOutfitStore((s) => s.savedOutfits)

  // 按当前场景 + 性别过滤记录
  const resolvedGender = userGender || "female"
  const sceneSavedOutfits = savedOutfits.filter((s) => s.sceneId === sceneId && s.gender === resolvedGender)
  const sceneGenerationHistory = generationHistory.filter((g) => g.sceneId === sceneId && g.gender === resolvedGender)

  // 保存搭配到 localStorage + Supabase（场景解锁需要 outfit 记录）
  async function saveOutfit(name: string) {
    saveOutfitLocal(name, sceneId, resolvedGender)
    if (!sceneId) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        guestSavePendingName.current = name
        setGuestSaveDialogOpen(true)
        return
      }
      const slots: Record<string, string | string[] | null> = {
        user_id: user.id,
        name,
        scene_id: sceneId,
        gender: resolvedGender,
        accessories: outfit.accessories.length > 0 ? outfit.accessories : null,
      }
      for (const slot of ["dress", "top", "bottom", "outerwear", "shoes", "bag"]) {
        slots[slot] = outfit[slot as keyof typeof outfit] as string | null
      }
      await supabase.from("outfits").insert(slots)
    } catch (err) {
      console.warn("[dressing] save to outfits table failed:", err)
    }
  }

  // 打开保存弹窗（替代 prompt，iOS Safari 上 prompt 不可靠）
  function triggerSaveDialog(defaultName: string) {
    setSaveNameValue(defaultName)
    setSaveDialogOpen(true)
    setTimeout(() => saveInputRef.current?.focus(), 100)
  }

  function confirmSave() {
    const name = saveNameValue.trim()
    if (name) {
      saveOutfit(name)
      track("outfit_save", { sceneId, properties: { name } })
      toast.success(`已保存「${name}」`)
    }
    setSaveDialogOpen(false)
  }
  const deleteOutfit = useOutfitStore((s) => s.deleteOutfit)
  const loadOutfit = useOutfitStore((s) => s.loadOutfit)
  const wearSet = useOutfitStore((s) => s.wearSet)
  const initFromStorage = useOutfitStore((s) => s.initFromStorage)
  const mergeOutfits = useOutfitStore((s) => s.mergeOutfits)

  // 客户端初始化 localStorage
  useEffect(() => { initFromStorage() }, [initFromStorage])

  // 诊断：React 是否成功 hydrate
  const [reactAlive, setReactAlive] = useState(false)
  useEffect(() => {
    setReactAlive(true)
    console.log("[dressing] React hydrated successfully")
  }, [])

  // 首次进入：桌面端一次性新手引导气泡（记住后不再显示）
  const [showGuide, setShowGuide] = useState(false)
  useEffect(() => {
    if (profileLoading) return
    try {
      if (!localStorage.getItem("sd-dressing-guide-seen")) setShowGuide(true)
    } catch {}
  }, [profileLoading])
  function dismissGuide() {
    setShowGuide(false)
    try { localStorage.setItem("sd-dressing-guide-seen", "1") } catch {}
  }

  // 造型师问候用的实时天气（客户端预取，沿用 ChatPanel 模式减少 Vercel HK 跨境调用）
  const [weather, setWeather] = useState<RemarkWeather | null>(null)

  // 获取浏览器定位
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => console.log("[dressing] 定位未授权，跳过天气推荐"),
      { timeout: 5000, maximumAge: 30 * 60 * 1000 },
    )
  }, [])

  // 定位就绪 → 客户端拉天气，供造型师进场问候引用今天真实天气
  useEffect(() => {
    if (!userCoords) return
    let cancelled = false
    fetch(`/api/weather?lat=${userCoords.lat}&lon=${userCoords.lon}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.current) return
        const temp = parseFloat(d.current.temp)
        if (!Number.isNaN(temp)) setWeather({ temp, condition: d.current.text || "" })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userCoords])

  // 加载场景 + 用户画像
  useEffect(() => {
    // 切换场景时清空上一个场景的搭配状态
    useOutfitStore.getState().clearAll()
    async function load() {
      // 场景
      if (sceneId) {
        const { data: sceneData } = await supabase.from("scenes").select("*").eq("id", sceneId).single()
        if (sceneData) {
          setScene(enrichScene(sceneData))
          track("scene_enter", { sceneId: sceneData.id, properties: { sceneName: sceneData.name } })
        }
      }
      // 先检查是否刚从首页选了性别（优先级最高）
      let guestGender: "female" | "male" | null = null
      try {
        const g = localStorage.getItem("guest_gender")
        if (g === "male" || g === "female") guestGender = g
      } catch {}
      console.log("[dressing] guest_gender:", guestGender)

      // 用户画像 + 同步（getUser 在无 session 时会抛异常，try-catch 兜底）
      let user: { id: string } | null = null
      try {
        const result = await supabase.auth.getUser()
        user = result.data.user ?? null
      } catch {}
      if (user) {
        const { data: profile } = await supabase.from("user_profiles")
          .select("gender, body_type, style_tags").eq("user_id", user.id).single()
        // 用户刚选了性别 → 优先生效；否则用 profile
        setUserGender(guestGender || profile?.gender || "female")
        if (profile?.body_type) setUserBodyType(profile.body_type)
        if (profile?.style_tags) setUserStyleTags(profile.style_tags)

        // 跨设备同步：从 Supabase 拉取保存方案，合并到本地
        try {
          const { data: serverOutfits, error: syncErr } = await supabase
            .from("outfits")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(30)
          if (!syncErr && serverOutfits && serverOutfits.length > 0) {
            const converted = serverOutfits.map((row: any) => ({
              id: row.id || `sv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: row.name || "",
              outfit: {
                dress: row.dress || null,
                top: row.top || null,
                bottom: row.bottom || null,
                outerwear: row.outerwear || null,
                shoes: row.shoes || null,
                bag: row.bag || null,
                accessories: Array.isArray(row.accessories) ? row.accessories : [],
              },
              sceneId: row.scene_id || null,
              gender: (row.gender || profile?.gender || "female") as "female" | "male",
              createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            }))
            mergeOutfits(converted)
          }
        } catch (e) {
          console.warn("[dressing] 同步服务端方案失败:", e)
        }
      } else {
        // 游客模式：使用首页性别选择
        if (guestGender) setUserGender(guestGender)
        setIsGuest(true)
        setGuestRemaining(getGuestRemaining())
      }

      setProfileLoading(false)
    }
    load()
  }, [sceneId])

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
    track("outfit_item_add", { sceneId, properties: { itemId: item.id, category } })
    toast.success(`已添加 ${item.name}`)
  }

  // 计时器：生成中显示耗时 + 阶段切换
  useEffect(() => {
    if (genStatus === "generating") {
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
  }, [genStatus === "generating"])

  // 收集搭配单品数据（直接从 store 读取，避免闭包 stale state）
  function collectItems() {
    const currentOutfit = useOutfitStore.getState().outfit
    const aiCache = useOutfitStore.getState().aiItemsCache
    const slots = ["dress", "top", "bottom", "outerwear", "shoes", "bag"] as const
    const items: { slot: string; name: string; color: string; category: string; material?: string | null; pattern?: string | null; sub_category?: string | null; fit?: string | null; length?: string | null; neckline?: string | null; detail?: string | null; style_tags?: string[] | null; image_url?: string | null }[] = []
    for (const slot of slots) {
      const id = currentOutfit[slot]
      if (id && typeof id === "string") {
        // 优先从模块级缓存取（API 直返数据），其次 personalItemCache，最后 AI 缓存
        let item = getCachedWardrobeItem(id) || getItemById(id) || aiCache[id]
        // AI 缓存的单品缺少 pattern/material 等结构化字段，按名称/品类匹配衣橱真实数据补全
        if (item && item.source === "ai_recommended") {
          const wardrobeItemsList = getCachedWardrobeItems()
          // 先精确匹配 name，再按品类兜底（同品类唯一时直接匹配）
          let wardrobeMatch = wardrobeItemsList.find((w) => w.name === item!.name)
          if (!wardrobeMatch) {
            const sameCategory = wardrobeItemsList.filter((w) => w.category === item!.category)
            if (sameCategory.length === 1) wardrobeMatch = sameCategory[0]
          }
          if (wardrobeMatch) {
            item = { ...item, pattern: item.pattern || wardrobeMatch.pattern, material: item.material || wardrobeMatch.material, fit: item.fit || wardrobeMatch.fit, length: item.length || wardrobeMatch.length, neckline: item.neckline || wardrobeMatch.neckline }
          }
        }
        if (item) {
          console.log(`[collectItems] slot=${slot} id=${id.slice(0,8)} name=${item.name} pattern="${item.pattern}" source=${item.source}`)
          items.push({ slot, name: item.name, color: item.color, category: item.category, material: item.material ?? null, pattern: item.pattern ?? null, sub_category: item.sub_category ?? null, fit: item.fit ?? null, length: item.length ?? null, neckline: item.neckline ?? null, detail: item.detail ?? null, style_tags: item.style_tags ?? null, image_url: item.image_url ?? null })
        }
      }
    }
    for (const accId of currentOutfit.accessories) {
      let acc = getCachedWardrobeItem(accId) || getItemById(accId) || aiCache[accId]
      if (acc && acc.source === "ai_recommended") {
        const wardrobeMatch = getCachedWardrobeItems().find((w) => w.name === acc!.name)
        if (wardrobeMatch) acc = { ...acc, pattern: wardrobeMatch.pattern, material: wardrobeMatch.material, fit: wardrobeMatch.fit, length: wardrobeMatch.length, neckline: wardrobeMatch.neckline }
      }
      if (acc) items.push({ slot: "accessories", name: acc.name, color: acc.color, category: "accessory", material: acc.material ?? null, pattern: acc.pattern ?? null, sub_category: acc.sub_category ?? null, fit: acc.fit ?? null, length: acc.length ?? null, neckline: acc.neckline ?? null, detail: acc.detail ?? null, style_tags: acc.style_tags ?? null, image_url: acc.image_url ?? null })
    }
    return items
  }

  const [genStage, setGenStage] = useState<"connecting" | "generating" | "processing">("connecting")
  const skipReviewRef = useRef(false)
  const generatedByAI = useRef(false)
  // 穿上 AI 方案时置 true，让 [outfit] effect 保留 AI 标记而非重置为 DIY
  const wearingAISetRef = useRef(false)
  const genStartTimeRef = useRef(0)
  const celebratedGenRef = useRef<number | null>(null)

  const hasAnyItem = !!outfit.dress || !!outfit.top || !!outfit.bottom || !!outfit.outerwear || !!outfit.shoes || !!outfit.bag || outfit.accessories.length > 0

  // 首次进入：移动端「我的衣橱」tab 脉冲提醒（等页面加载完成后再触发）
  const [pulseWardrobeTab, setPulseWardrobeTab] = useState(false)
  useEffect(() => {
    console.log("[pulse] effect run, profileLoading=", profileLoading)
    if (profileLoading) { console.log("[pulse] blocked by profileLoading"); return }
    let lsVal = null
    try { lsVal = localStorage.getItem("sd-wardrobe-tab-pulsed-v2") } catch (e) { console.log("[pulse] localStorage error", e) }
    if (lsVal) { console.log("[pulse] blocked by localStorage, key exists"); return }
    console.log("[pulse] scheduling timer in 800ms")
    const timer = setTimeout(() => {
      setPulseWardrobeTab(true)
      console.log("[pulse] setPulseWardrobeTab(true) fired")
      try { localStorage.setItem("sd-wardrobe-tab-pulsed-v2", "1") } catch {}
    }, 800)
    return () => { console.log("[pulse] timer cleaned up"); clearTimeout(timer) }
  }, [profileLoading])
  // 用户添加衣服后取消脉冲
  useEffect(() => {
    if (hasAnyItem && pulseWardrobeTab) setPulseWardrobeTab(false)
  }, [hasAnyItem, pulseWardrobeTab])
  // 5 秒后自动取消
  useEffect(() => {
    if (!pulseWardrobeTab) return
    const timer = setTimeout(() => setPulseWardrobeTab(false), 5000)
    return () => clearTimeout(timer)
  }, [pulseWardrobeTab])

  // 调用评价 API
  async function evaluateOutfit() {
    setReviewLoading(true)
    try {
      const currentOutfit = useOutfitStore.getState().outfit
      const token = await getAuthToken()
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ outfit: currentOutfit, scene: scene?.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "评价失败")
      setReviewData(data)
      track("evaluation_complete", { sceneId, properties: { totalScore: data.totalScore } })
    } catch (err: any) {
      console.warn("[evaluate] 评价失败:", err.message)
      // 评价失败不阻塞，静默处理
    } finally {
      setReviewLoading(false)
    }
  }

  // 轮询生图状态
  useEffect(() => {
    if (genTaskId == null || genStatus !== "generating") return

    const poll = async () => {
      try {
        const genUrl = process.env.NEXT_PUBLIC_FC_GENERATE_OUTFIT_URL || "/api/generate-outfit"
        const res = await fetch(`${genUrl}?taskId=${genTaskId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "查询失败")

        if (data.status === "done") {
          const angleIdx = generatingAngleRef.current ?? 0
          generatingAngleRef.current = null
          setGenStatus("done")
          setGeneratingAngle(null)
          setResultImages((prev) => {
            const next = new Map(prev)
            next.set(angleIdx, { url: data.imageUrl, prompt: data.prompt || "", promptZh: data.promptZh, mode: data.mode || "text_only" })
            return next
          })
          track("generation_complete", { sceneId, properties: { angleIndex: angleIdx, mode: data.mode || "text_only" } })
          addGenRecord({
            imageUrl: data.imageUrl,
            prompt: data.prompt || "",
            mode: data.mode || "unknown",
            sceneId,
            gender: resolvedGender,
          })
          // 生图完成自动弹出结果，同时确保评价已触发
          setShowResult(true)
          if (!generatedByAI.current && !reviewLoading && !reviewData) evaluateOutfit()
        } else if (data.status === "error") {
          setGenStatus("error")
          setGenError(data.error || "生成失败")
          track("generation_error", { sceneId, properties: { error: data.error || "unknown" } })
        }
      } catch {
        // 网络抖动，继续轮询
      }
    }

    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [genTaskId, genStatus])

  // 游客每日生成次数限制（3次/天，localStorage 记录）
  function getGuestRemaining(): number {
    try {
      const stored = JSON.parse(localStorage.getItem("guest_gen_count") || "{}")
      const today = new Date().toISOString().slice(0, 10)
      if (stored.date !== today) return 3
      return Math.max(0, 3 - stored.count)
    } catch { return 3 }
  }
  function checkGuestDailyLimit(): boolean {
    return getGuestRemaining() > 0
  }
  function incrementGuestGenCount() {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const stored = JSON.parse(localStorage.getItem("guest_gen_count") || "{}")
      const count = stored.date === today ? stored.count + 1 : 1
      localStorage.setItem("guest_gen_count", JSON.stringify({ date: today, count }))
      setGuestRemaining(Math.max(0, 3 - count))
    } catch {}
  }

  // 为指定角度提交生图任务
  async function generateForAngle(angleIdx: number, options?: { skipReview?: boolean }) {
    const items = collectItems()
    if (items.length === 0) { toast.error("请先搭配至少一件单品"); return }

    // 游客每日限制检查
    const token = await getAuthToken()
    if (!token && !checkGuestDailyLimit()) {
      toast.error(
        "今日免费次数已用完（3次/天），注册后不限次数",
        { duration: 5000 },
      )
      setTimeout(() => router.push("/auth"), 2000)
      return
    }

    const skipReview = options?.skipReview ?? false
    skipReviewRef.current = skipReview
    if (skipReview) generatedByAI.current = true

    // 将 UI 角度索引映射为 API 角度索引（跳过3/4侧）
    const apiAngle = toApiAngle(angleIdx)

    if (resultImages.has(apiAngle)) {
      setResultAngle(angleIdx)
      setShowResult(true)
      return
    }

    setGenStatus("generating")
    setGenError(null)
    setGeneratingAngle(apiAngle)
    generatingAngleRef.current = apiAngle
    setResultAngle(angleIdx)
    // 立即弹出结果弹窗，让用户看到人台「正在定制穿衣」的生成过程
    setShowResult(true)
    genStartTimeRef.current = Date.now()
    track("generation_start", { sceneId, properties: { angleIndex: apiAngle, itemCount: items.length } })

    const reqBody = JSON.stringify({ gender: userGender, items, angleIndex: apiAngle })
    let lastErr: any = null

    // 生图偶发超时（Hobby 60s 函数上限），失败透明重试一次；优先走 FC 上海
    const genUrl = process.env.NEXT_PUBLIC_FC_GENERATE_OUTFIT_URL || "/api/generate-outfit"
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(genUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: reqBody,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "生成失败")

        generatingAngleRef.current = null
        setGenStatus("done")
        setGeneratingAngle(null)
        setResultImages((prev) => {
          const next = new Map(prev)
          next.set(apiAngle, { url: data.imageUrl, prompt: data.prompt || "", promptZh: data.promptZh, mode: data.mode || "text_only" })
          return next
        })
        addGenRecord({
          imageUrl: data.imageUrl,
          prompt: data.prompt || "",
          mode: data.mode || "unknown",
          sceneId,
          gender: resolvedGender,
        })
        if (!token) {
          incrementGuestGenCount()
          const stored = JSON.parse(localStorage.getItem("guest_gen_count") || "{}")
          const remaining = Math.max(0, 3 - (stored.count || 3))
          if (remaining <= 1) {
            toast(`今日免费次数还剩 ${remaining} 次，注册后不限次数`, { icon: "💡", duration: 4000 })
          }
        }
        if (!skipReview && !generatedByAI.current && !reviewLoading) evaluateOutfit()
        return
      } catch (err: any) {
        lastErr = err
        if (attempt === 0) console.warn("[generate-outfit] 首次失败，重试一次:", err?.message)
      }
    }

    setGenStatus("error")
    setGenError(lastErr?.message || "生成失败")
    toast.error(lastErr?.message || "生成失败，请重试")
  }

  // 完成搭配 → 生成当前角度（仅 DIY 才触发评价）
  async function handleCompleteOutfit() {
    const items = collectItems()
    if (items.length === 0) { toast.error("请先搭配至少一件单品"); return }

    // 如果当前角度已有结果，直接展示，不重复生成和评价
    const apiAngle = toApiAngle(angleIndex)
    if (resultImages.has(apiAngle)) {
      setShowResult(true)
      return
    }

    // 用户手动点击"完成搭配"，重置 AI 标记以触发评价
    generatedByAI.current = false

    const evalPromise = evaluateOutfit()
    await generateForAngle(angleIndex)
    await evalPromise
  }

  function handleViewResult() {
    setShowResult(true)
    if (!reviewData && !reviewLoading && !generatedByAI.current) evaluateOutfit()
    track("result_view", { sceneId })
  }

  function handleViewProgress() {
    setShowResult(true)
    if (!reviewData && !reviewLoading && !generatedByAI.current) evaluateOutfit()
  }

  function handleRetry() {
    if (generatingAngle !== null) {
      // generatingAngle 是 API 角度，转回 UI 角度
      const uiAngle = generatingAngle === 2 ? 1 : 0
      generateForAngle(uiAngle)
    }
  }

  function handleDragEnd(event: { active: { data: { current?: { item?: ClothingItem } } } }) {
    const item = event.active?.data?.current?.item
    if (!item) return
    const category = item.category
    if (category === "accessory") {
      addAccessory(item.id)
    } else {
      const slot = CATEGORY_TO_SLOT[category] as "dress" | "top" | "bottom" | "outerwear" | "shoes" | "bag" | undefined
      if (slot) setSlot(slot, item.id)
    }
    toast.success(`已添加 ${item.name}`)
  }

  return (
    <>
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col flex-1 h-[100dvh]">
        {/* 顶部操作栏 */}
        <header className="relative flex flex-col bg-soft-white border-b border-warm-gray/20">
          {/* 第一行：场景名居中，🔊 紧邻其右，返回靠最右 */}
          <div className="relative flex items-center justify-center gap-2 px-4 pt-2.5 pb-1">
            <h2 className="text-xl font-semibold bg-[linear-gradient(90deg,#A6B27E,#788A50)] bg-clip-text text-transparent">
              {scene?.name || "自由搭配"}
            </h2>
            <AmbientSound name={scene?.name || ""} moodTags={scene?.mood_tags || []} ambientSoundUrl={scene?.ambient_sound_url || null} />
            <button
              onClick={() => router.push('/scenes')}
              className="absolute right-4 text-sm text-warm-gray hover:text-rose transition-colors"
            >
              ← 返回
            </button>
          </div>

          {/* 第二行：左 衣橱/搭搭，右 保存/下载 */}
          <div className="flex items-center justify-between px-4 pb-2.5">
            <div className="flex items-center gap-3">
              {/* 桌面端面板切换：衣橱 / 搭搭，同一时间只开一个 */}
              <button
                onClick={() => { dismissGuide(); setShareCloseTrigger(p => p + 1); setDesktopPanel(prev => prev === "wardrobe" ? null : "wardrobe") }}
                className={`hidden md:flex text-xl transition-transform hover:scale-110 ${
                  desktopPanel === "wardrobe" ? "scale-110" : ""
                }`}
                title="衣橱"
              >
                {userGender === "male" ? "👔" : "👗"}
              </button>
              <button
                onClick={() => { dismissGuide(); setShareCloseTrigger(p => p + 1); setDesktopPanel(prev => prev === "chat" ? null : "chat") }}
                className={`hidden md:flex text-xl transition-transform hover:scale-110 ${
                  desktopPanel === "chat" ? "scale-110" : ""
                }`}
                title="搭搭"
              >
                🦊
              </button>
            </div>
            <div className="flex items-center gap-2">
            {/* 保存当前搭配 */}
            <button
              onClick={() => {
                const hasItems = outfit.dress || outfit.top || outfit.bottom
                if (!hasItems) { toast.error("请先搭配至少一件单品"); return }
                triggerSaveDialog(`搭配 ${new Date().toLocaleTimeString()}`)
              }}
              className="text-[11px] px-3 py-1.5 rounded-full border border-warm-gray/30 text-warm-gray hover:text-rose hover:border-rose/30 transition-colors"
            >
              💾 保存
            </button>
            {/* 下载（生成记录 + 保存方案） */}
            <div className="relative">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                  showHistory ? "border-rose/40 text-rose" : "border-warm-gray/30 text-warm-gray"
                }`}
              >
                ⏬ 下载 ({sceneGenerationHistory.length + sceneSavedOutfits.length})
              </button>
              {showHistory && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowHistory(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-soft-white rounded-2xl shadow-xl border border-warm-gray/20 z-50 p-3">
                    {sceneSavedOutfits.length > 0 && (
                      <>
                        <p className="text-[10px] text-warm-gray/50 uppercase tracking-wide mb-2">保存的方案</p>
                        {sceneSavedOutfits.slice(0, 8).map((s) => (
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
                    {sceneGenerationHistory.length > 0 && (
                      <>
                        <p className="text-[10px] text-warm-gray/50 uppercase tracking-wide mb-2 mt-3">生成记录</p>
                        {sceneGenerationHistory.slice(0, 6).map((g) => (
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
                    {sceneSavedOutfits.length === 0 && sceneGenerationHistory.length === 0 && (
                      <p className="text-xs text-warm-gray/50 text-center py-4">暂无记录</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          </div>

          {/* 首次进入新手引导气泡（桌面端一次性） */}
          {showGuide && (
            <div className="hidden md:block absolute left-3 top-full mt-1.5 z-[60]">
              <div className="ml-3 w-3 h-3 bg-charcoal rotate-45 -mb-1.5" />
              <div className="relative bg-charcoal text-soft-white rounded-2xl shadow-xl px-4 py-3 w-[264px]">
                <p className="text-xs font-medium mb-2">👋 欢迎来到搭配间</p>
                <p className="text-[11px] leading-relaxed mb-1.5">
                  <span className="font-medium">👗 衣橱</span> — 浏览、挑选你的衣服
                </p>
                <p className="text-[11px] leading-relaxed mb-3">
                  <span className="font-medium">🦊 搭搭</span> — 让 AI 帮你一键出搭配方案
                </p>
                <button
                  onClick={dismissGuide}
                  className="text-[11px] px-3 py-1 rounded-full bg-soft-white/20 hover:bg-soft-white/30 transition-colors"
                >
                  知道了
                </button>
              </div>
            </div>
          )}
        </header>

        {/* 主体三区布局 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左：衣橱面板 — 桌面端，与聊天互斥 */}
          {desktopPanel === "wardrobe" && (
            <div className="hidden md:block md:w-[35%] lg:w-[30%] h-full overflow-hidden relative border-r border-warm-gray/20">
              <WardrobePanel
                gender={userGender}
                pendingCategory={pendingCategory}
                onItemClick={handleQuickAdd}
                onUndo={undo}
                onClearAll={clearAll}
                hasHistory={history.length > 0}
              />
              <button
                onClick={() => setDesktopPanel(null)}
                className="absolute top-3 -right-3 z-10 w-6 h-6 rounded-full bg-rose/10 text-rose text-xs
                           flex items-center justify-center hover:bg-rose/20 transition-colors"
                title="收起衣橱"
              >
                ◀
              </button>
            </div>
          )}

          {/* 中：模特展示区 */}
          <div className="flex-1 flex flex-col items-center overflow-y-auto relative pb-24">
            {/* 场景背景 */}
            {scene?.illustration_url && (
              <div className="absolute inset-0 pointer-events-none">
                <img
                  src={scene.illustration_url}
                  alt=""
                  className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-soft-white/60 via-transparent to-soft-white/60" />
              </div>
            )}
            <SceneParticles name={scene?.name} />
            <StylistRemark sceneName={scene?.name} weather={weather} />
            <div className="relative z-10 flex flex-col items-center w-full">
            {profileLoading ? (
              <div className="flex items-center justify-center w-full" style={{ aspectRatio: "4/7", maxWidth: "220px" }}>
                <div className="w-10 h-10 rounded-full border-[3px] border-warm-gray/15 border-t-rose animate-spin" />
              </div>
            ) : (
            <ModelDisplay gender={userGender || "female"} angleIndex={angleIndex} onAngleChange={setAngleIndex} />
            )}

            {/* 移动端：浮动完成按钮（可拖动） */}
            {hasAnyItem && !mobileTab && (
              <div
                ref={btnRef}
                className="md:hidden fixed z-30 flex flex-col items-center gap-1 select-none"
                style={{
                  right: "16px",
                  bottom: "112px",
                  transform: `translate3d(${btnOffset.tx}px, ${btnOffset.ty}px, 0)`,
                  willChange: "transform",
                  touchAction: "none",
                }}
                onPointerDown={(e) => {
                  btnDragging.current = true
                  btnDrag.current.startX = e.clientX
                  btnDrag.current.startY = e.clientY
                  btnDrag.current.startTX = btnOffset.tx
                  btnDrag.current.startTY = btnOffset.ty
                  btnDrag.current.moved = false
                  const el = btnRef.current
                  if (el) el.style.transition = "none"
                  e.currentTarget.setPointerCapture(e.pointerId)
                }}
                onPointerMove={(e) => {
                  if (!btnDragging.current) return
                  const dx = e.clientX - btnDrag.current.startX
                  const dy = e.clientY - btnDrag.current.startY
                  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    btnDrag.current.moved = true
                  }
                  if (!btnDrag.current.moved) return
                  let newTX = btnDrag.current.startTX + dx
                  let newTY = btnDrag.current.startTY + dy
                  // 边界约束：按钮不超出屏幕
                  const maxTX = 16
                  const minTX = -(window.innerWidth - 72)
                  const maxTY = 112
                  const minTY = -(window.innerHeight - 262)
                  newTX = Math.max(minTX, Math.min(maxTX, newTX))
                  newTY = Math.max(minTY, Math.min(maxTY, newTY))
                  const el = btnRef.current
                  if (el) {
                    el.style.transform = `translate3d(${newTX}px, ${newTY}px, 0)`
                  }
                }}
                onPointerUp={(e) => {
                  btnDragging.current = false
                  const el = btnRef.current
                  if (el) {
                    el.style.transition = ""
                    // 从 DOM transform 读取最终位移，回写 state
                    const t = el.style.transform
                    const match = t.match(/translate3d\(([^,]+)px,\s*([^,]+)px/)
                    if (match) {
                      setBtnOffset({ tx: parseFloat(match[1]), ty: parseFloat(match[2]) })
                    }
                  }
                }}
              >
                <button
                  onClick={() => {
                    if (btnDrag.current.moved) return
                    if (genStatus === "generating") { handleViewProgress(); return }
                    if (genStatus === "done") { handleViewResult(); return }
                    handleCompleteOutfit()
                  }}
                  className="w-14 h-14 rounded-full bg-charcoal text-white shadow-xl
                             flex items-center justify-center text-xl
                             active:scale-95 transition-transform
                             animate-pulse"
                >
                  {genStatus === "generating" ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : "✨"}
                </button>
                <span className="text-[10px] text-charcoal/60 font-medium bg-soft-white/90 px-2 py-0.5 rounded-full shadow-sm pointer-events-none">
                  完成搭配
                </span>
                {isGuest && (
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                    guestRemaining > 0 ? "text-warm-gray/50 bg-cream/80" : "text-rose bg-rose/5"
                  }`}>
                    {guestRemaining > 0 ? `今日${guestRemaining}/3次` : "今日用完"}
                  </span>
                )}
              </div>
            )}
            </div>
          </div>

          {/* 右：搭搭聊天 — 桌面端全屏浮层，常驻挂载不丢对话，与衣橱互斥 */}
          <div className={desktopPanel === "chat"
            ? "hidden md:flex fixed inset-0 z-[80] bg-soft-white flex-col"
            : "hidden"
          }>
            <ChatPanel
              currentOutfit={outfit}
              onClose={() => setDesktopPanel(null)}
              onGenerateOutfit={() => { setDesktopPanel(null); generatedByAI.current = true; generateForAngle(angleIndex, { skipReview: true }) }}
              onWearSet={(items) => { wearingAISetRef.current = true; wearSet(items) }}
              userCoords={userCoords}
              gender={userGender}
              bodyType={userBodyType}
              styleTags={userStyleTags}
            />
          </div>
        </div>

        {/* 桌面端：底部栏 — 个人衣橱 + 搭配清单 + 完成按钮 */}
        <div className="hidden md:block bg-soft-white/90 border-t border-warm-gray/20 px-6 pt-3">
          <PersonalWardrobeBar onItemClick={handleQuickAdd} />
          <div className="flex items-center justify-between gap-4 pb-4 pt-2">
            <div className="flex-1 overflow-x-auto">
              <OutfitBar gender={userGender} />
            </div>
            <button
              onClick={
                genStatus === "generating" ? handleViewProgress
                : genStatus === "done" ? handleViewResult
                : handleCompleteOutfit
              }
              className="flex-shrink-0 flex items-center gap-2 px-12 py-2.5 rounded-2xl bg-charcoal text-soft-white text-sm
                         font-medium tracking-wide active:scale-[0.98] transition-all"
            >
              {genStatus === "generating" && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              完成搭配 ✨
            </button>
            {isGuest && (
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                guestRemaining > 0 ? "text-warm-gray/60" : "text-rose"
              }`}>
                {guestRemaining > 0 ? `今日剩余 ${guestRemaining}/3 次` : "今日次数已用完"}
              </span>
            )}
          </div>
        </div>

        {/* 移动端：衣橱底部抽屉 + 遮罩 */}
        {drawerOpen && (
          <div className="fixed inset-0 z-[70] md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 h-[50vh]">
              <WardrobePanel
                gender={userGender}
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

      {/* 右侧浮动生图进度条 */}
      <GenerationBar
        status={genStatus}
        error={genError || undefined}
        onViewResult={handleViewResult}
        onRetry={handleRetry}
        onViewProgress={handleViewProgress}
      />

      {/* 移动端底部安全区占位 */}
      <div className="lg:hidden h-16" />
    </DndContext>

    {/* 移动端：搭配清单 — 固定在 Tab 栏上方，始终可见 */}
    <div className="md:hidden fixed inset-x-0 z-30 bg-soft-white/95 backdrop-blur-sm border-t border-warm-gray/15 px-0 py-2"
         style={{ bottom: "52px" }}>
      <OutfitBar compact onAddClick={handleAddClick} gender={userGender} />
    </div>

    {/* 移动端：底部双 Tab 面板 */}
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-40">
      {/* 面板内容 */}
      <div
        className={`bg-soft-white rounded-t-3xl shadow-2xl border-t border-warm-gray/15 overflow-hidden transition-all duration-300 ${
          mobileTab
            ? mobilePanelHeight === "half" ? "h-[50vh]" : "h-[85vh]"
            : "h-0 border-t-0"
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

          {/* 衣橱面板 */}
          <div className={`h-full overflow-hidden flex flex-col ${mobileTab === "wardrobe" ? "" : "hidden"}`}>
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

          {/* 搭搭聊天 — 常驻挂载，用 hidden 切换，不丢对话 */}
          <div className={`h-full overflow-hidden ${mobileTab === "chat" ? "" : "hidden"}`}>
            <ChatPanel
              currentOutfit={outfit}
              onClose={() => setMobileTab(null)}
              onGenerateOutfit={() => { setMobileTab(null); generatedByAI.current = true; generateForAngle(angleIndex, { skipReview: true }) }}
              onWearSet={(items) => {
                wearingAISetRef.current = true
                wearSet(items)
              }}
              userCoords={userCoords}
              gender={userGender}
              bodyType={userBodyType}
              styleTags={userStyleTags}
              autoFocus
            />
          </div>
        </div>

      {/* Tab 切换栏 */}
      <div className="flex items-center gap-2 px-4 py-2 bg-soft-white border-t border-warm-gray/20">
        <motion.button
          onClick={() => {
            setShareCloseTrigger(p => p + 1)
            if (mobileTab === "wardrobe") setMobileTab(null)
            else { setMobileTab("wardrobe"); setMobilePanelHeight("half"); setPulseWardrobeTab(false) }
          }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium active:scale-[0.98] ${
            mobileTab === "wardrobe" ? "bg-rose text-white" : "bg-cream text-charcoal"
          }`}
          animate={pulseWardrobeTab ? {
            backgroundColor: "#C4A8A3",
            color: "#FFFFFF",
            boxShadow: ["0 0 0px rgba(196,168,163,0)", "0 0 20px rgba(196,168,163,0.6)", "0 0 0px rgba(196,168,163,0)"],
          } : {}}
          transition={pulseWardrobeTab ? { boxShadow: { repeat: Infinity, duration: 1.5 } } : {}}
        >
          👤 我的衣橱
        </motion.button>
        <button
          onClick={() => {
            setShareCloseTrigger(p => p + 1)
            if (mobileTab === "chat") setMobileTab(null)
            else { setMobileTab("chat"); setMobilePanelHeight("full") }
          }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-[background-color,color] active:scale-[0.98] ${
            mobileTab === "chat"
              ? "bg-charcoal text-white"
              : "bg-cream text-charcoal"
          }`}
        >
          🦊 搭搭
        </button>
      </div>
    </div>

    {/* AI 生成结果弹窗 */}
    {showResult && (
      <ResultModal
        resultImages={resultImages}
        resultAngle={resultAngle}
        generatingAngle={generatingAngle}
        genStage={genStage}
        elapsed={elapsed}
        gender={userGender!}
        shouldCelebrate={
          genStartTimeRef.current !== 0 &&
          celebratedGenRef.current !== genStartTimeRef.current
        }
        onCelebrated={() => {
          celebratedGenRef.current = genStartTimeRef.current
        }}
        onAngleChange={(i) => {
          setResultAngle(i)
        }}
        onGenerateAngle={(i) => {
          setResultAngle(i)
          setShowResult(true)
          // 并行启动评价（如果尚未评价且不在评价中）
          if (!reviewData && !reviewLoading && !generatedByAI.current) evaluateOutfit()
          generateForAngle(i)
        }}
        onClose={() => { setShowResult(false) }}
        onRetry={() => { setShowResult(false); clearAll(); toast.success("试试换个风格搭配吧～", { duration: 2000 }) }}
        reviewData={reviewData}
        reviewLoading={reviewLoading}
        shareCloseTrigger={shareCloseTrigger}
        onSave={() => {
          const hasItems = outfit.dress || outfit.top || outfit.bottom
          if (!hasItems) { toast.error("请先搭配至少一件单品"); return }
          triggerSaveDialog("")
        }}
      />
    )}

    {/* 保存搭配弹窗（替代 prompt，iOS Safari 兼容） */}
    {saveDialogOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={() => setSaveDialogOpen(false)} />
        <div className="relative bg-soft-white rounded-2xl shadow-xl w-full max-w-xs p-6 z-10">
          <h3 className="text-sm font-medium text-charcoal mb-4">保存搭配方案</h3>
          <input
            ref={saveInputRef}
            type="text"
            value={saveNameValue}
            onChange={(e) => setSaveNameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmSave() }}
            placeholder="给这个搭配方案起个名字"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-warm-gray/30 bg-cream/30
                       text-charcoal placeholder:text-warm-gray/40 outline-none
                       focus:border-rose/40 transition-colors"
            autoFocus
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setSaveDialogOpen(false)}
              className="flex-1 py-2 rounded-xl text-sm text-warm-gray border border-warm-gray/20
                         hover:bg-warm-gray/5 transition-colors"
            >
              取消
            </button>
            <button
              onClick={confirmSave}
              className="flex-1 py-2 rounded-xl text-sm text-white bg-charcoal
                         hover:bg-charcoal/90 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 游客保存引导：注册 or 换风格 */}
    {guestSaveDialogOpen && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={() => setGuestSaveDialogOpen(false)} />
        <div className="relative bg-soft-white rounded-2xl shadow-xl w-full max-w-xs p-6 z-10 text-center">
          <p className="text-3xl mb-3">🎉</p>
          <h3 className="text-sm font-medium text-charcoal mb-1">喜欢这套搭配吗？</h3>
          <p className="text-xs text-warm-gray/60 mb-5">注册后可随时查看和回顾你的搭配</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setGuestSaveDialogOpen(false)
                clearAll()
                setShowResult(false)
                toast.success("试试换个风格搭配吧～", { duration: 2500 })
              }}
              className="flex-1 py-2.5 rounded-xl text-sm text-warm-gray border border-warm-gray/20
                         hover:bg-warm-gray/5 transition-colors"
            >
              换风格再试
            </button>
            <button
              onClick={() => {
                setGuestSaveDialogOpen(false)
                router.push(`/auth?redirect=${encodeURIComponent("/dressing?id=" + (sceneId || ""))}`)
              }}
              className="flex-1 py-2.5 rounded-xl text-sm text-white bg-rose
                         hover:bg-rose/90 transition-colors font-medium"
            >
              注册保存
            </button>
          </div>
        </div>
      </div>
    )}
  </>
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
