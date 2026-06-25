"use client"

import { useEffect, useState } from "react"

type ParticleType = "sakura"

// 场景名 → 粒子特效（仿 scene-assets 的本地映射，无需 DB 迁移）
// 目前只配置「周末 brunch」；以后加 snow / leaves / bokeh 等只改这张表即可
const SCENE_EFFECTS: Record<string, ParticleType> = {
  "周末 brunch": "sakura",
}

const PETAL_COUNT = 18
const PETAL_COLORS = ["#f7cdd9", "#f3b8cb", "#fadfe9"]
// 单片樱花瓣：顶部收尖、底部略带凹口（小尺寸下为印象式形状）
const PETAL_PATH = "M12 2 C 7 7 7 15 11 21 C 11.5 21.8 12.5 21.8 13 21 C 17 15 17 7 12 2 Z"

interface Petal {
  left: number
  size: number
  opacity: number
  fallDur: number
  fallDelay: number
  swayDur: number
  spinDur: number
  drift: number
  color: string
}

interface Props {
  name?: string | null
}

export default function SceneParticles({ name }: Props) {
  const effect = name ? SCENE_EFFECTS[name] : undefined
  const [petals, setPetals] = useState<Petal[]>([])

  // 客户端生成随机参数（避免 SSR 水合不一致）
  useEffect(() => {
    if (!effect) {
      setPetals([])
      return
    }
    setPetals(
      Array.from({ length: PETAL_COUNT }, () => ({
        left: Math.random() * 100,
        size: 8 + Math.random() * 8, // 8-16px
        opacity: 0.35 + Math.random() * 0.3, // 低透明，克制
        fallDur: 10 + Math.random() * 8, // 10-18s 缓慢飘落
        fallDelay: -Math.random() * 18, // 负延迟：首屏即散布、不齐刷刷
        swayDur: 2.5 + Math.random() * 2.5,
        spinDur: 5 + Math.random() * 5,
        drift: 24 + Math.random() * 48, // 水平漂移幅度 px
        color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      }))
    )
  }, [effect])

  if (!effect || petals.length === 0) return null

  return (
    <div className="sakura-layer absolute inset-0 z-[5] overflow-hidden pointer-events-none" aria-hidden>
      {petals.map((p, i) => (
        <span
          key={i}
          className="sakura-petal"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              "--fall-dur": `${p.fallDur}s`,
              "--fall-delay": `${p.fallDelay}s`,
            } as React.CSSProperties
          }
        >
          <span
            className="sakura-sway"
            style={{ "--sway-dur": `${p.swayDur}s`, "--drift": `${p.drift}px` } as React.CSSProperties}
          >
            <svg viewBox="0 0 24 24" width="100%" height="100%" style={{ "--spin-dur": `${p.spinDur}s` } as React.CSSProperties}>
              <path d={PETAL_PATH} fill={p.color} />
            </svg>
          </span>
        </span>
      ))}
    </div>
  )
}
