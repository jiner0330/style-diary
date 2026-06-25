"use client"

import { useEffect, useState } from "react"

type ParticleType = "sakura"

// 场景名 → 粒子特效（仿 scene-assets 的本地映射，无需 DB 迁移）
// 目前只配置「周末 brunch」；以后加 snow / leaves / bokeh 等只改这张表即可
const SCENE_EFFECTS: Record<string, ParticleType> = {
  "周末 brunch": "sakura",
}

// 加深后的樱花粉色调
const PETAL_COLORS = ["#eeaac2", "#e890ae", "#f3c2d5"]
// 单片樱花瓣：顶部收尖、底部略带凹口（小尺寸下为印象式形状）
const PETAL_PATH = "M12 2 C 7 7 7 15 11 21 C 11.5 21.8 12.5 21.8 13 21 C 17 15 17 7 12 2 Z"

// 两层制造前后景深：back 飘在人台之后，front 飘到人台之前（更大更实更快）
const LAYERS = [
  { key: "back", count: 20, z: "z-[5]", sizeMin: 8, sizeMax: 16, opMin: 0.4, opMax: 0.7, fallMin: 11, fallMax: 18 },
  { key: "front", count: 10, z: "z-20", sizeMin: 13, sizeMax: 22, opMin: 0.5, opMax: 0.82, fallMin: 8, fallMax: 13 },
] as const

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

function makePetals(cfg: (typeof LAYERS)[number]): Petal[] {
  return Array.from({ length: cfg.count }, () => ({
    left: Math.random() * 100,
    size: cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin),
    opacity: cfg.opMin + Math.random() * (cfg.opMax - cfg.opMin),
    fallDur: cfg.fallMin + Math.random() * (cfg.fallMax - cfg.fallMin),
    fallDelay: -Math.random() * 18, // 负延迟：首屏即散布、不齐刷刷
    swayDur: 2.5 + Math.random() * 2.5,
    spinDur: 5 + Math.random() * 5,
    drift: 24 + Math.random() * 48, // 水平漂移幅度 px
    color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
  }))
}

interface Props {
  name?: string | null
}

export default function SceneParticles({ name }: Props) {
  const effect = name ? SCENE_EFFECTS[name] : undefined
  const [layers, setLayers] = useState<Petal[][]>([])

  // 客户端生成随机参数（避免 SSR 水合不一致）
  useEffect(() => {
    if (!effect) {
      setLayers([])
      return
    }
    setLayers(LAYERS.map((cfg) => makePetals(cfg)))
  }, [effect])

  if (!effect || layers.length === 0) return null

  return (
    <>
      {LAYERS.map((cfg, li) => (
        <div
          key={cfg.key}
          className={`sakura-layer absolute inset-0 ${cfg.z} overflow-hidden pointer-events-none`}
          aria-hidden
        >
          {(layers[li] ?? []).map((p, i) => (
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
      ))}
    </>
  )
}
