"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useOutfitStore } from "@/store/outfit"
import { getItemById } from "@/lib/mock-data"

const ROTATION_ANGLES = ["000", "045", "180"] as const
const TOTAL_FRAMES = ROTATION_ANGLES.length

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
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartX = useRef(0)
  const dragStartIndex = useRef(0)
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
    setDragOffset(0)
  }

  function moveDrag(clientX: number) {
    if (!isDragging) return
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const dx = clientX - dragStartX.current
      setDragOffset(dx)
      const steps = Math.round(dx / 15)
      const newIndex = ((dragStartIndex.current - steps) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES
      setAngleIndex(newIndex)
    })
  }

  function endDrag() {
    setIsDragging(false)
    cancelAnimationFrame(rafRef.current)
    setDragOffset(0)
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
          ? `已搭配 ${filledCount} 件 ✦ ${gender === "female" ? "拖拽旋转 · " : ""}继续拖拽或点击下方卡片替换`
          : `拖拽单品到人台 ✦ ${gender === "female" ? "水平拖拽人台可旋转" : ""}`}
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
        className={`relative w-full max-w-[220px] md:max-w-[420px] rounded-3xl transition-[box-shadow,transform] duration-500
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

        {/* 人台底图 — opacity 过渡 */}
        <div className="mannequin-bg absolute inset-0 flex items-center justify-center rounded-3xl">
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

        {/* 拖拽视觉反馈 */}
        {isDragging && Math.abs(dragOffset) > 0 && (
          <div className="absolute inset-y-0 w-1/2 flex items-center pointer-events-none"
               style={{ left: dragOffset > 0 ? 0 : "auto", right: dragOffset < 0 ? 0 : "auto" }}>
            <div className={`w-full h-full ${dragOffset > 0 ? "bg-gradient-to-r" : "bg-gradient-to-l"} from-rose/5 to-transparent transition-opacity duration-75`} />
          </div>
        )}
      </div>
    </div>
  )
}
