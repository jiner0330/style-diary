"use client"

import { useEffect, useMemo, useState } from "react"
import { pickRemark, type RemarkWeather } from "@/lib/stylist-remark"

interface Props {
  sceneName?: string | null
  weather?: RemarkWeather | null
}

const ENTER_DELAY = 600 // 进场景后停顿，像造型师"注意到你"
const AUTO_COLLAPSE = 7000 // 展开后自动收起成只剩 🦊

export default function StylistRemark({ sceneName, weather }: Props) {
  // 同一场景+天气下文案稳定（pickRemark 随机，仅在 deps 变化时重抽）
  const remark = useMemo(
    () => pickRemark(sceneName, weather),
    [sceneName, weather?.temp, weather?.condition],
  )

  const [mounted, setMounted] = useState(false) // 延迟后才出现
  const [open, setOpen] = useState(false) // 气泡是否展开（收起后仅剩 🦊）

  // 切换场景/天气：重置后延迟弹入
  useEffect(() => {
    setMounted(false)
    setOpen(false)
    const t = setTimeout(() => {
      setMounted(true)
      setOpen(true)
    }, ENTER_DELAY)
    return () => clearTimeout(t)
  }, [remark])

  // 展开后自动收起；点 🦊 重新展开会再次续期
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => setOpen(false), AUTO_COLLAPSE)
    return () => clearTimeout(t)
  }, [open])

  if (!sceneName || !mounted) return null

  return (
    <div className="absolute top-3 left-3 z-20 flex items-start gap-2 pointer-events-none max-w-[80%]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="造型师搭搭"
        className="pointer-events-auto shrink-0 text-2xl md:text-3xl leading-none animate-fox-tilt
                   drop-shadow-[0_2px_4px_rgba(60,50,45,0.3)] active:scale-95 transition-transform"
      >
        🦊
      </button>

      {open && (
        <div className="animate-fade-in-up relative bg-charcoal text-soft-white rounded-2xl shadow-xl
                        px-3 py-2 max-w-[200px] md:max-w-[240px] text-[11px] md:text-xs leading-snug">
          <span className="block text-[9px] text-soft-white/55 mb-0.5">搭搭</span>
          {remark}
          {/* 指向 🦊 的小三角 */}
          <div className="absolute -left-1 top-3 w-2.5 h-2.5 bg-charcoal rotate-45" />
        </div>
      )}
    </div>
  )
}
