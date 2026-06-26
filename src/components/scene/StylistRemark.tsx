"use client"

import { useEffect, useMemo, useState } from "react"
import { pickRemark, weatherGlyph, type RemarkWeather } from "@/lib/stylist-remark"

interface Props {
  sceneName?: string | null
  weather?: RemarkWeather | null
}

const ENTER_DELAY = 600 // 桌面端进场景后停顿，像造型师"注意到你"
const AUTO_COLLAPSE = 7000 // 桌面端展开后自动收起成只剩图标

export default function StylistRemark({ sceneName, weather }: Props) {
  // 同一场景+天气下文案稳定（pickRemark 随机，仅在 deps 变化时重抽）
  const remark = useMemo(
    () => pickRemark(sceneName, weather),
    [sceneName, weather?.temp, weather?.condition],
  )

  // 图标随今天天气变，替代顶部已有的搭搭 logo（不重复）
  const glyph = weatherGlyph(weather)

  // 移动端人台居中且放大，两侧无空当——改成人台上方常驻横幅（in-flow 把人台挤下、不遮头顶）
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const [mounted, setMounted] = useState(false) // 桌面端延迟后才出现
  const [open, setOpen] = useState(false) // 桌面端气泡是否展开（收起后仅剩图标）

  // 切换场景/天气：重置后延迟弹入（桌面端用）
  useEffect(() => {
    setMounted(false)
    setOpen(false)
    const t = setTimeout(() => {
      setMounted(true)
      setOpen(true)
    }, ENTER_DELAY)
    return () => clearTimeout(t)
  }, [remark])

  // 桌面端浮层展开后自动收起；移动端常驻横幅不收（避免人台跳动）
  useEffect(() => {
    if (isMobile || !open) return
    const t = setTimeout(() => setOpen(false), AUTO_COLLAPSE)
    return () => clearTimeout(t)
  }, [open, isMobile])

  if (!sceneName) return null

  // 移动端：人台上方常驻横幅（正常布局流，把人台挤下去，绝不遮头顶）
  if (isMobile) {
    return (
      <div className="relative z-20 w-full px-3 pt-2 animate-fade-in-up">
        <div className="flex items-start gap-2 bg-charcoal text-soft-white rounded-2xl shadow-lg px-3 py-2">
          <span className="shrink-0 text-xl leading-none animate-fox-tilt drop-shadow-[0_2px_4px_rgba(60,50,45,0.3)]">
            {glyph}
          </span>
          <span className="text-[11px] leading-snug">
            <span className="text-[9px] text-soft-white/55 mr-1">搭搭</span>
            {remark}
          </span>
        </div>
      </div>
    )
  }

  // 桌面端：左上角浮层气泡（点图标可收/展，7s 自动收起）
  if (!mounted) return null
  return (
    <div className="absolute top-3 left-3 z-20 flex items-start gap-2 pointer-events-none max-w-[80%]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="今日造型提示"
        className="pointer-events-auto shrink-0 text-3xl leading-none animate-fox-tilt
                   drop-shadow-[0_2px_4px_rgba(60,50,45,0.3)] active:scale-95 transition-transform"
      >
        {glyph}
      </button>

      {open && (
        <div className="animate-fade-in-up relative bg-charcoal text-soft-white rounded-2xl shadow-xl
                        px-3 py-2 max-w-[240px] text-xs leading-snug">
          <span className="block text-[9px] text-soft-white/55 mb-0.5">搭搭</span>
          {remark}
          {/* 指向图标的小三角 */}
          <div className="absolute -left-1 top-3 w-2.5 h-2.5 bg-charcoal rotate-45" />
        </div>
      )}
    </div>
  )
}
