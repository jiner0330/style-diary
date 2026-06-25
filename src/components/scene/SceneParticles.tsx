"use client"

import { useEffect, useState } from "react"

type ParticleType = "sakura" | "glint" | "bokeh" | "mote"

// 场景名 → 粒子特效（仿 scene-assets 的本地映射，无需 DB 迁移）
// 加新场景/特效只改这两张表即可
const SCENE_EFFECTS: Record<string, ParticleType> = {
  "周末 brunch": "sakura",
  "三天海边旅行": "glint",
  "第一次约会": "bokeh",
  "书店咖啡馆独处": "mote",
}

// 单片樱花瓣：顶部收尖、底部略带凹口（小尺寸下为印象式形状）
const PETAL_PATH = "M12 2 C 7 7 7 15 11 21 C 11.5 21.8 12.5 21.8 13 21 C 17 15 17 7 12 2 Z"

interface LayerCfg {
  z: string // tailwind z-index 类名（字面量，供 JIT 扫描）
  count: number
  sizeMin: number
  sizeMax: number
  opMin: number
  opMax: number
  durMin: number // 主位移动画时长区间（下落/上浮/漂移）
  durMax: number
}

interface EffectCfg {
  fx: string // 容器类名（fx-*），决定各层用哪组 keyframes
  shape: "petal" | "circle"
  scatter: boolean // true：随机散布 + 原地漂移；false：竖向贯穿
  colors: string[]
  blur?: number // glyph 模糊（bokeh/mote 柔化）
  glow?: boolean // glyph 柔光（波光）
  swayMin: number
  swayMax: number
  glyphMin: number // glyph 动画时长区间（自转/呼吸/闪烁）
  glyphMax: number
  driftMin: number
  driftMax: number
  layers: LayerCfg[]
}

const EFFECTS: Record<ParticleType, EffectCfg> = {
  // 樱花飘落（周末 brunch）：双层前后景深
  sakura: {
    fx: "fx-sakura",
    shape: "petal",
    scatter: false,
    colors: ["#eeaac2", "#e890ae", "#f3c2d5"],
    swayMin: 2.5,
    swayMax: 5,
    glyphMin: 5,
    glyphMax: 10,
    driftMin: 24,
    driftMax: 72,
    layers: [
      { z: "z-[5]", count: 20, sizeMin: 8, sizeMax: 16, opMin: 0.4, opMax: 0.7, durMin: 11, durMax: 18 },
      { z: "z-20", count: 10, sizeMin: 13, sizeMax: 22, opMin: 0.5, opMax: 0.82, durMin: 8, durMax: 13 },
    ],
  },
  // 阳光波光（三天海边旅行）：散布原地闪烁 + 轻微漂移
  glint: {
    fx: "fx-glint",
    shape: "circle",
    scatter: true,
    glow: true,
    colors: ["#ffffff", "#fde6b8", "#f7f0da"],
    swayMin: 0,
    swayMax: 0,
    glyphMin: 1.8,
    glyphMax: 3.6,
    driftMin: 8,
    driftMax: 22,
    layers: [{ z: "z-[5]", count: 26, sizeMin: 2, sizeMax: 5, opMin: 0.5, opMax: 0.95, durMin: 9, durMax: 16 }],
  },
  // 暖色柔光 bokeh（第一次约会）：缓慢上浮 + 摇摆 + 缩放呼吸，双层景深
  bokeh: {
    fx: "fx-bokeh",
    shape: "circle",
    scatter: false,
    blur: 4,
    colors: ["#f6d6a6", "#f3bfc8", "#ffe0b6", "#f1b6cd"],
    swayMin: 4,
    swayMax: 8,
    glyphMin: 5,
    glyphMax: 9,
    driftMin: 20,
    driftMax: 60,
    layers: [
      { z: "z-[5]", count: 10, sizeMin: 14, sizeMax: 30, opMin: 0.14, opMax: 0.36, durMin: 16, durMax: 26 },
      { z: "z-20", count: 5, sizeMin: 24, sizeMax: 44, opMin: 0.12, opMax: 0.28, durMin: 14, durMax: 22 },
    ],
  },
  // 窗光浮尘（书店咖啡馆独处）：低重力慢飘 + 透明度微闪
  mote: {
    fx: "fx-mote",
    shape: "circle",
    scatter: true,
    blur: 0.8,
    colors: ["#f3e6cf", "#efe1c6", "#f7eede"],
    swayMin: 0,
    swayMax: 0,
    glyphMin: 3,
    glyphMax: 5.5,
    driftMin: 10,
    driftMax: 26,
    layers: [{ z: "z-[5]", count: 14, sizeMin: 2, sizeMax: 4.5, opMin: 0.25, opMax: 0.6, durMin: 16, durMax: 26 }],
  },
}

interface Particle {
  left: number
  top: number
  size: number
  opacity: number
  color: string
  dur: number
  delay: number
  swayDur: number
  glyphDur: number
  drift: number
}

function makeParticles(fx: EffectCfg, layer: LayerCfg): Particle[] {
  return Array.from({ length: layer.count }, () => ({
    left: Math.random() * 100,
    top: fx.scatter ? Math.random() * 100 : 0,
    size: layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin),
    opacity: layer.opMin + Math.random() * (layer.opMax - layer.opMin),
    color: fx.colors[Math.floor(Math.random() * fx.colors.length)],
    dur: layer.durMin + Math.random() * (layer.durMax - layer.durMin),
    delay: -Math.random() * layer.durMax, // 负延迟：首屏即散布、不齐刷刷
    swayDur: fx.swayMin + Math.random() * (fx.swayMax - fx.swayMin),
    glyphDur: fx.glyphMin + Math.random() * (fx.glyphMax - fx.glyphMin),
    drift: fx.driftMin + Math.random() * (fx.driftMax - fx.driftMin),
  }))
}

interface Props {
  name?: string | null
}

export default function SceneParticles({ name }: Props) {
  const type = name ? SCENE_EFFECTS[name] : undefined
  const fx = type ? EFFECTS[type] : undefined
  const [layers, setLayers] = useState<Particle[][]>([])

  // 客户端生成随机参数（避免 SSR 水合不一致）
  useEffect(() => {
    if (!fx) {
      setLayers([])
      return
    }
    setLayers(fx.layers.map((layer) => makeParticles(fx, layer)))
  }, [fx])

  if (!fx || layers.length === 0) return null

  return (
    <>
      {fx.layers.map((layer, li) => (
        <div
          key={li}
          className={`particle-layer ${fx.fx} absolute inset-0 ${layer.z} overflow-hidden pointer-events-none`}
          aria-hidden
        >
          {(layers[li] ?? []).map((p, i) => (
            <span
              key={i}
              className="p-fall"
              style={
                {
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  width: p.size,
                  height: p.size,
                  opacity: p.opacity,
                  "--fall-dur": `${p.dur}s`,
                  "--fall-delay": `${p.delay}s`,
                  "--drift": `${p.drift}px`,
                } as React.CSSProperties
              }
            >
              <span className="p-sway" style={{ "--sway-dur": `${p.swayDur}s` } as React.CSSProperties}>
                {fx.shape === "petal" ? (
                  <svg className="p-glyph" viewBox="0 0 24 24" style={{ "--glyph-dur": `${p.glyphDur}s` } as React.CSSProperties}>
                    <path d={PETAL_PATH} fill={p.color} />
                  </svg>
                ) : (
                  <span
                    className="p-glyph"
                    style={
                      {
                        "--glyph-dur": `${p.glyphDur}s`,
                        borderRadius: "50%",
                        background: p.color,
                        filter: fx.blur ? `blur(${fx.blur}px)` : undefined,
                        boxShadow: fx.glow ? `0 0 ${p.size * 1.6}px ${p.size * 0.5}px ${p.color}` : undefined,
                      } as React.CSSProperties
                    }
                  />
                )}
              </span>
            </span>
          ))}
        </div>
      ))}
    </>
  )
}
