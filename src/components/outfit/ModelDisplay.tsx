"use client"

import { useState, useRef, useEffect } from "react"
import { useOutfitStore } from "@/store/outfit"
import { getItemById } from "@/lib/mock-data"

// 人台图资源版本号：换图/重抠时手动 +1 强制刷新缓存；平时固定，刷新走浏览器缓存（不再每刷必重下）
const MANNEQUIN_VER = "4"

const ROTATION_ANGLES = ["000", "180"] as const
const TOTAL_FRAMES = ROTATION_ANGLES.length
const ANGLE_LABELS = ["正面", "背面"]
const SWIPE_THRESHOLD = 30
const MAX_VISUAL_SHIFT = 120

// 人台缩放：头顶已贴容器顶边，纯上移会裁到头；从顶部锚点缩小才能在不裁头的前提下把脚提起来
const FIGURE_SCALE = 0.74
// 人台垂直偏移（百分比，负值上移）；脚位 ≈ 0.03 + 0.81*FIGURE_SCALE，越小脚越高
const FIGURE_OFFSET_Y = -3
// 脚部在原图（未变换）中的容器纵向占比（实测 ML 抠图 ≈0.90），用于把角度指示器/标签贴到脚下方
const FIGURE_FEET_FRAC = 0.9
// 移动端人台整体放大系数：移动端画面里人台偏小，单独放大；桌面端仍用 FIGURE_SCALE
const FIGURE_MOBILE_BOOST = 1.2
// 桌面端把角度指示器/标签整体再上移的量（容器纵向占比）；仅桌面端，移动端不动；人台与锚点不受影响
const DESKTOP_CHROME_LIFT = 0.03

const SLOT_MARKERS: Record<string, { top: string; left: string; label: string }> = {
  accessories:{ top: "10%", left: "50%", label: "饰" },
  outerwear:  { top: "32%", left: "50%", label: "外" },
  top:        { top: "32%", left: "50%", label: "上" },
  dress:      { top: "38%", left: "50%", label: "裙" },
  bottom:     { top: "68%", left: "50%", label: "下" },
  shoes:      { top: "89%", left: "42%", label: ""  },
}

// UI index → API angleIndex
function toApiAngle(uiIndex: number): number {
  return uiIndex === 0 ? 0 : 2
}

interface Props {
  gender: "female" | "male"
  angleIndex?: number
  onAngleChange?: (uiIndex: number) => void
}

export default function ModelDisplay({ gender, angleIndex: controlledIndex, onAngleChange }: Props) {
  const outfit = useOutfitStore((s) => s.outfit)
  const filledCount = (["dress","top","bottom","outerwear","shoes","bag"] as const)
    .filter((s) => !!outfit[s]).length + outfit.accessories.length

  const [internalIndex, setInternalIndex] = useState(0)
  const angleIndex = controlledIndex ?? internalIndex
  const setAngleIndex = (i: number) => {
    setInternalIndex(i)
    onAngleChange?.(i)
  }

  const mannequinPrefix = gender === "female" ? "mannequin-female" : "mannequin-male"

  const [isDragging, setIsDragging] = useState(false)
  const [visualShift, setVisualShift] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const isDraggingRef = useRef(false)
  const dragStartX = useRef(0)
  const dragStartIndex = useRef(0)
  const currentDx = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef(0)

  // 预加载图片
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set())
  useEffect(() => {
    ROTATION_ANGLES.forEach((angle) => {
      const img = new Image()
      img.src = `/${mannequinPrefix}-${angle}.png?v=${MANNEQUIN_VER}`
      img.onload = () => setImagesLoaded((prev) => new Set(prev).add(angle))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender])

  // 移动端检测（<768px，对齐 md: 断点），移动端人台单独放大
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  function startDrag(clientX: number) {
    isDraggingRef.current = true
    setIsDragging(true)
    dragStartX.current = clientX
    dragStartIndex.current = angleIndex
    currentDx.current = 0
    setVisualShift(0)
  }

  function moveDrag(clientX: number) {
    if (!isDraggingRef.current) return
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const dx = clientX - dragStartX.current
      currentDx.current = dx
      const clamped = Math.max(-MAX_VISUAL_SHIFT, Math.min(MAX_VISUAL_SHIFT, dx))
      setVisualShift(clamped)
    })
  }

  function endDrag() {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    setIsDragging(false)
    cancelAnimationFrame(rafRef.current)

    const dx = currentDx.current
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const direction = dx > 0 ? -1 : 1
      const newIndex = ((dragStartIndex.current + direction) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES
      setAngleIndex(newIndex)
    }
    currentDx.current = 0
    setVisualShift(0)
  }

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  function isMarkerTarget(el: EventTarget | null): boolean {
    return !!(el as HTMLElement)?.closest?.("[data-marker]")
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (isMarkerTarget(e.target)) return
    e.preventDefault()
    startDrag(e.clientX)
    containerRef.current?.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    moveDrag(e.clientX)
  }

  function handlePointerUp(e: React.PointerEvent) {
    endDrag()
    try { containerRef.current?.releasePointerCapture(e.pointerId) } catch {}
  }

  const mannequinSrc = `/${mannequinPrefix}-${ROTATION_ANGLES[angleIndex]}.png?v=${MANNEQUIN_VER}`

  // 标记点（男生不显示连衣裙锚点）
  const markerEntries = Object.entries(SLOT_MARKERS)
    .filter(([slot]) => gender !== "male" || slot !== "dress")
  const rawMarkers = markerEntries.map(([slot, pos]) => {
    let itemId: string | undefined
    if (slot === "accessories") {
      itemId = outfit.accessories[0]
    } else {
      const id = outfit[slot as keyof typeof outfit]
      itemId = (id && typeof id === "string") ? id : undefined
    }
    const item = itemId ? getItemById(itemId) : undefined
    return { slot, ...pos, filled: !!item, color: item?.color, name: item?.name }
  })

  const merged: typeof rawMarkers = []
  const seen = new Set<string>()
  for (const m of rawMarkers) {
    const key = `${m.top}-${m.left}`
    if (seen.has(key)) {
      const prev = merged.find((x) => `${x.top}-${x.left}` === key)
      if (prev) {
        prev.label = [prev.label, m.label].filter(Boolean).join("/")
        if (m.filled && prev.filled) {
          prev.name = `${prev.name ?? ""}+${m.name ?? ""}`
        } else if (m.filled) {
          prev.filled = true; prev.color = m.color; prev.name = m.name
        }
      }
    } else {
      seen.add(key); merged.push({ ...m })
    }
  }

  // 移动端整体放大（FIGURE_MOBILE_BOOST），桌面端用 FIGURE_SCALE
  const figureScale = isMobile ? FIGURE_SCALE * FIGURE_MOBILE_BOOST : FIGURE_SCALE
  // 人台与锚点共用同一变换，保证缩放/上移后锚点始终贴合图形
  const figureTransform = {
    transform: `translateX(${visualShift}px) translateY(${FIGURE_OFFSET_Y}%) scale(${figureScale})`,
    transformOrigin: "50% 0%",
    transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1.2)",
  }
  // 脚部变换后落点（容器纵向占比），角度指示器/标签据此贴在脚下方一并随人台移动
  const feetY = figureScale * FIGURE_FEET_FRAC + FIGURE_OFFSET_Y / 100
  // 桌面端把指示器/标签整体再上移（人台与锚点不动）；移动端保持原位
  const chromeLift = isMobile ? 0 : DESKTOP_CHROME_LIFT

  return (
    <div className="flex flex-col items-center w-full py-4 md:py-6 md:pb-6">
      {filledCount > 0 ? (
        <p className="text-[11px] text-charcoal/70 font-medium mb-3 tracking-wide">
          {isMobile
            ? `已搭配 ${filledCount} 件 ✦ 左右滑动旋转 · 继续挑选替换`
            : `已搭配 ${filledCount} 件 ✦ 左右滑动旋转 · 继续拖拽或点击下方卡片替换`}
        </p>
      ) : (
        <div className="flex flex-col items-center gap-2 mb-3">
          <p className="text-[12px] text-charcoal/70 font-medium tracking-wide">
            {isMobile
              ? `点击下方「搭配清单」挑选衣服 ✦ 左右滑动旋转人台`
              : `拖拽单品到人台 ✦ 在人台上左右滑动可旋转`}
          </p>
          {/* 空态步骤引导 */}
          {isMobile && (
            <div className="flex items-center gap-1">
              {["挑选衣服", "点击 ✨ 生成", "查看效果"].map((label, i) => (
                <div key={label} className="flex items-center gap-0.5">
                  <span className="flex flex-col items-center">
                    <span className="w-5 h-5 rounded-full bg-cream flex items-center justify-center
                                     text-[10px] font-medium text-charcoal/50">
                      {i + 1}
                    </span>
                    <span className="text-[9px] text-warm-gray/40 mt-0.5">{label}</span>
                  </span>
                  {i < 2 && <span className="text-warm-gray/15 text-[10px] mx-0.5">→</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative w-full max-w-[264px] md:max-w-[420px] rounded-3xl
          overflow-hidden select-none
          ${isDragging ? "cursor-grabbing" : "cursor-ew-resize"}`}
        style={{ aspectRatio: "4/7", touchAction: "none" }}
      >
        {/* 预加载所有角度图片（隐藏） */}
        {ROTATION_ANGLES.map((angle) => (
          <img
            key={`preload-${angle}`}
            src={`/${mannequinPrefix}-${angle}.png?v=${MANNEQUIN_VER}`}
            alt=""
            className="hidden"
            draggable={false}
          />
        ))}

        {/* 人台底图 — translateX 跟手 + 松手回弹 */}
        <div
          className="mannequin-bg absolute inset-0 flex items-center justify-center rounded-3xl"
          style={figureTransform}
        >
          <img
            src={mannequinSrc}
            alt={`人台 ${ROTATION_ANGLES[angleIndex]}°`}
            className="w-full h-full object-contain select-none pointer-events-none transition-opacity duration-150 animate-breathe"
            draggable={false}
            style={{
              opacity: !imagesLoaded.has(ROTATION_ANGLES[angleIndex]) ? 0.6 : 1,
              filter: "drop-shadow(0 6px 14px rgba(60,50,45,0.30))",
            }}
          />
        </div>

        {/* 身体标记点（与人台同步缩放/位移，锚点贴合图形） */}
        <div className="absolute inset-0 z-10 pointer-events-none" style={figureTransform}>
        {merged.map((m) => (
          <div
            key={m.slot}
            data-marker="true"
            className="absolute pointer-events-none flex flex-col items-center transition-[width,height,opacity] duration-300"
            style={{ top: m.top, left: m.left, transform: "translate(-50%, -50%)" }}
          >
            <span
              className={`rounded-full transition-[width,height,box-shadow,opacity] duration-300
                ${m.filled
                  ? "w-3 h-3 shadow-[0_0_10px_rgba(0,0,0,0.25)]"
                  : "w-2 h-2 animate-pulse opacity-70 shadow-none"
                }`}
              style={{ backgroundColor: m.filled ? m.color : "#8F857B" }}
            />
            {m.label && (
              <span className={`text-[9px] mt-0.5 font-medium transition-colors duration-300
                ${m.filled ? "text-charcoal/80" : "text-warm-gray/65"}`}>
                {m.label}
              </span>
            )}
            {m.filled && m.name && (
              <span className="text-[8px] text-warm-gray/50 mt-px leading-tight max-w-[40px] truncate text-center">
                {m.name}
              </span>
            )}
          </div>
        ))}
        </div>

        {/* 角度指示器（贴在脚下方，随人台缩放/位移同步） */}
        <div className="absolute left-1/2 -translate-x-1/2 z-10 flex gap-1"
             style={{ top: `${(feetY + 0.06 - chromeLift) * 100}%` }}>
          {ROTATION_ANGLES.map((_, i) => (
            <span
              key={i}
              className={`w-1 h-1 rounded-full transition-all duration-200
                ${i === angleIndex ? "bg-charcoal/60 w-2.5" : "bg-charcoal/20"}`}
            />
          ))}
        </div>

        {/* 角度标签（贴在脚下方、指示器上方，随人台缩放/位移同步） */}
        <div className="absolute left-1/2 -translate-x-1/2 z-10 flex gap-12"
             style={{ top: `${(feetY + 0.035 - chromeLift) * 100}%` }}>
          {ANGLE_LABELS.map((label, i) => (
            <span
              key={i}
              className={`text-[9px] transition-colors duration-200 ${
                i === angleIndex ? "text-charcoal/60" : "text-charcoal/0"
              }`}
            >
              {label}
            </span>
          ))}
        </div>

        {/* 拖拽方向箭头提示 */}
        {isDragging && Math.abs(visualShift) > 5 && (
          <div className="absolute inset-y-0 w-1/2 flex items-center pointer-events-none"
               style={{ left: visualShift > 0 ? 0 : "auto", right: visualShift < 0 ? 0 : "auto" }}>
            <div className={`w-full h-full ${visualShift > 0 ? "bg-gradient-to-r" : "bg-gradient-to-l"} from-rose/5 to-transparent`} />
          </div>
        )}

        {/* 即将切换的阈值提示 */}
        {isDragging && Math.abs(currentDx.current) > SWIPE_THRESHOLD * 0.7 && Math.abs(currentDx.current) < SWIPE_THRESHOLD && (
          <div className="absolute inset-y-0 flex items-center pointer-events-none"
               style={{ left: currentDx.current > 0 ? 0 : "auto", right: currentDx.current < 0 ? 0 : "auto" }}>
            <div className={`h-full w-1 ${currentDx.current > 0 ? "bg-gradient-to-r" : "bg-gradient-to-l"} from-rose/20 to-transparent`} />
          </div>
        )}
      </div>
    </div>
  )
}
