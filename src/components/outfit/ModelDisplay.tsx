"use client"

import { useState, useRef, useCallback } from "react"
import { useOutfitStore } from "@/store/outfit"
import { getItemById } from "@/lib/mock-data"
import { useDroppable } from "@dnd-kit/core"

// 8 角度人台序列
const ROTATION_ANGLES = ["000", "045", "180"] as const
const TOTAL_FRAMES = ROTATION_ANGLES.length

// 身体标记点 · 6 个品类
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

  const { setNodeRef, isOver } = useDroppable({ id: "model-drop" })

  // ---- 360° 旋转（支持受控/非受控） ----
  const [internalIndex, setInternalIndex] = useState(0)
  const angleIndex = controlledIndex ?? internalIndex
  const setAngleIndex = (i: number) => {
    setInternalIndex(i)
    onAngleChange?.(i)
  }
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartIndex = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const mannequinSrc = gender === "female"
    ? `/mannequin-female-${ROTATION_ANGLES[angleIndex]}.png`
    : "/mannequin-male.png"

  const setNodeRefWrapped = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node)
    containerRef.current = node
  }, [setNodeRef])

  function handlePointerDown(e: React.PointerEvent) {
    // 只在人台容器上触发（排除标记点等子元素）
    if (e.target === containerRef.current || (e.target as HTMLElement).closest(".mannequin-bg")) {
      e.preventDefault()
      setIsDragging(true)
      dragStartX.current = e.clientX
      dragStartIndex.current = angleIndex
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging) return
    const dx = e.clientX - dragStartX.current
    // 每 30px 水平移动切换一个角度
    const steps = Math.round(dx / 30)
    const newIndex = ((dragStartIndex.current - steps) % TOTAL_FRAMES + TOTAL_FRAMES) % TOTAL_FRAMES
    setAngleIndex(newIndex)
  }

  function handlePointerUp(e: React.PointerEvent) {
    setIsDragging(false)
    try { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId) } catch {}
  }

  // ---- 标记点逻辑 ----
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

      {/* 人台容器 */}
      <div
        ref={setNodeRefWrapped}
        onPointerDown={gender === "female" ? handlePointerDown : undefined}
        onPointerMove={gender === "female" ? handlePointerMove : undefined}
        onPointerUp={gender === "female" ? handlePointerUp : undefined}
        onPointerLeave={gender === "female" ? handlePointerUp : undefined}
        className={`relative w-full max-w-[180px] md:max-w-[420px] rounded-3xl transition-[box-shadow,transform] duration-500
          overflow-hidden
          ${isOver
            ? "ring-3 ring-rose/40 scale-[1.02]"
            : ""}
          ${isDragging ? "cursor-grabbing" : gender === "female" ? "cursor-ew-resize" : ""}`}
        style={{ aspectRatio: "4/7", touchAction: "none" }}
      >
        {/* 人台底图 */}
        <div className="mannequin-bg absolute inset-0 flex items-center justify-center rounded-3xl">
          <img
            src={mannequinSrc}
            alt={gender === "female" ? `人台 ${ROTATION_ANGLES[angleIndex]}°` : "男生人台"}
            className="w-full h-full object-contain select-none pointer-events-none"
            draggable={false}
          />
        </div>

        {/* 身体标记点 */}
        {merged.map((m) => (
          <div
            key={m.slot}
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

        {/* 拖拽悬停提示 */}
        {isOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center
                          rounded-3xl bg-rose/5 backdrop-blur-[2px]">
            <span className="text-rose/70 font-medium text-sm tracking-wider animate-pulse">
              ✦ 松开放置 ✦
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
