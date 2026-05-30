"use client"

import { useState, useRef, useEffect } from "react"
import { useOutfitStore } from "@/store/outfit"
import { getItemById } from "@/lib/mock-data"

const ROTATION_ANGLES = ["000", "045", "180"] as const
const TOTAL_FRAMES = ROTATION_ANGLES.length
const SWIPE_THRESHOLD = 60  // px — drag must exceed this to switch angle
const MAX_VISUAL_SHIFT = 80 // px — max translateX during drag

const SLOT_MARKERS: Record<string, { top: string; left: string; label: string }> = {
  accessories:{ top: "10%", left: "50%", label: "饰" },
  outerwear:  { top: "32%", left: "50%", label: "外" },
  top:        { top: "32%", left: "50%", label: "上" },
  dress:      { top: "38%", left: "50%", label: "裙" },
  bag:        { top: "54%", left: "74%", label: ""  },
  bottom:     { top: "68%", left: "50%", label: "下" },
  shoes:      { top: "89%", left: "42%", label: ""  },
}

interface Props {
  gender: "female" | "male"
  angleIndex?: number
  onAngleChange?: (index: number) => void
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

  const [isDragging, setIsDragging] = useState(false)
  const [visualShift, setVisualShift] = useState(0) // translateX for image follow
  const dragStartX = useRef(0)
  const dragStartIndex = useRef(0)
  const currentDx = useRef(0) // actual dx for angle decision on release
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef(0)

  // 预加载图片
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (gender !== "female") return
    ROTATION_ANGLES.forEach((angle) => {
      const img = new Image()
      img.src = `/mannequin-female-${angle}.png?v=2`
      img.onload = () => setImagesLoaded((prev) => new Set(prev).add(angle))
    })
  }, [gender])

  function startDrag(clientX: number) {
    setIsDragging(true)
    dragStartX.current = clientX
    dragStartIndex.current = angleIndex
    currentDx.current = 0
    setVisualShift(0)
  }

  function moveDrag(clientX: number) {
    if (!isDragging) return
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const dx = clientX - dragStartX.current
      currentDx.current = dx
      // Clamp visual shift for translateX
      const clamped = Math.max(-MAX_VISUAL_SHIFT, Math.min(MAX_VISUAL_SHIFT, dx))
      setVisualShift(clamped)
    })
  }

  function endDrag() {
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

  function handleTouchStart(e: React.TouchEvent) {
    if (isMarkerTarget(e.target)) return
    const touch = e.touches[0]
    if (!touch) return
    e.preventDefault()
    startDrag(touch.clientX)
  }

  function handleTouchMove(e: React.TouchEvent) {
    const touch = e.touches[0]
    if (!touch) return
    moveDrag(touch.clientX)
  }

  function handleTouchEnd() {
    endDrag()
  }

  const mannequinSrc = gender === "female"
    ? `/mannequin-female-${ROTATION_ANGLES[angleIndex]}.png?v=2`
    : "/mannequin-male.png?v=2"

  // 标记点
  const rawMarkers = Object.entries(SLOT_MARKERS).map(([slot, pos]) => {
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

  return (
    <div className="flex flex-col items-center w-full py-4 md:py-6 md:pb-6">
      <p className="text-[11px] text-warm-gray/60 mb-3 tracking-wide">
        {filledCount > 0
          ? `已搭配 ${filledCount} 件 ✦ ${gender === "female" ? "左右滑动旋转 · " : ""}继续拖拽或点击下方卡片替换`
          : `拖拽单品到人台 ✦ ${gender === "female" ? "在人台上左右滑动可旋转" : ""}`}
      </p>

      <div
        ref={containerRef}
        onPointerDown={gender === "female" ? handlePointerDown : undefined}
        onPointerMove={gender === "female" ? handlePointerMove : undefined}
        onPointerUp={gender === "female" ? handlePointerUp : undefined}
        onPointerLeave={gender === "female" ? handlePointerUp : undefined}
        onTouchStart={gender === "female" ? handleTouchStart : undefined}
        onTouchMove={gender === "female" ? handleTouchMove : undefined}
        onTouchEnd={gender === "female" ? handleTouchEnd : undefined}
        className={`relative w-full max-w-[220px] md:max-w-[420px] rounded-3xl transition-[box-shadow] duration-500
          overflow-hidden select-none
          ${isDragging ? "cursor-grabbing shadow-lg" : gender === "female" ? "cursor-ew-resize" : ""}`}
        style={{ aspectRatio: "4/7", touchAction: "none" }}
      >
        {/* 预加载所有角度图片（隐藏） */}
        {gender === "female" && ROTATION_ANGLES.map((angle) => (
          <img
            key={`preload-${angle}`}
            src={`/mannequin-female-${angle}.png?v=2`}
            alt=""
            className="hidden"
            draggable={false}
          />
        ))}

        {/* 人台底图 — translateX 跟手 + 松手回弹 */}
        <div
          className="mannequin-bg absolute inset-0 flex items-center justify-center rounded-3xl"
          style={{
            transform: `translateX(${visualShift}px)`,
            transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1.2)",
          }}
        >
          <img
            src={mannequinSrc}
            alt={gender === "female" ? `人台 ${ROTATION_ANGLES[angleIndex]}°` : "男生人台"}
            className="w-full h-full object-contain select-none pointer-events-none transition-opacity duration-150"
            draggable={false}
            style={{
              opacity: gender === "female" && !imagesLoaded.has(ROTATION_ANGLES[angleIndex]) ? 0.6 : 1,
            }}
          />
        </div>

        {/* 身体标记点 */}
        {merged.map((m) => (
          <div
            key={m.slot}
            data-marker="true"
            className="absolute z-10 pointer-events-none flex flex-col items-center transition-[width,height,opacity] duration-300"
            style={{ top: m.top, left: m.left, transform: "translate(-50%, -50%)" }}
          >
            <span
              className={`rounded-full transition-[width,height,box-shadow,opacity] duration-300
                ${m.filled
                  ? "w-3 h-3 shadow-[0_0_10px_rgba(0,0,0,0.25)]"
                  : "w-2 h-2 animate-pulse opacity-40 shadow-none"
                }`}
              style={{ backgroundColor: m.filled ? m.color : "#B0A8A0" }}
            />
            {m.label && (
              <span className={`text-[9px] mt-0.5 font-medium transition-colors duration-300
                ${m.filled ? "text-charcoal/80" : "text-warm-gray/40"}`}>
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

        {/* 角度指示器 */}
        {gender === "female" && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1">
            {ROTATION_ANGLES.map((_, i) => (
              <span
                key={i}
                className={`w-1 h-1 rounded-full transition-all duration-200
                  ${i === angleIndex ? "bg-charcoal/60 w-2.5" : "bg-charcoal/20"}`}
              />
            ))}
          </div>
        )}

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
