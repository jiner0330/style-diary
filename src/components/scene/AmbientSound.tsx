"use client"

import { useState, useRef, useCallback, useEffect } from "react"

interface Props {
  moodTags: string[]
  name: string
  ambientSoundUrl: string | null
}

function detectSoundTheme(name: string, moodTags: string[]): string {
  const text = name + moodTags.join("")
  if (/书店|咖啡|独处|安静|阅读/.test(text)) return "cafe"
  if (/海边|旅行|度假|自由|海|浪/.test(text)) return "waves"
  if (/户外|徒步|骑行|森林|自然|运动|健身/.test(text)) return "forest"
  if (/雨|雨声/.test(text)) return "rain"
  if (/职场|通勤|城市|商务|逛街/.test(text)) return "city"
  if (/约会|晚宴|派对/.test(text)) return "night"
  return "cafe"
}

// 简易噪声生成器
function createNoiseBuffer(ctx: AudioContext, duration: number, filter?: (i: number) => number): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = sampleRate * duration
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = filter ? filter(i) : Math.random() * 2 - 1
  }
  return buffer
}

function setupSoundscape(ctx: AudioContext, theme: string): { nodes: AudioNode[]; cleanup: () => void } {
  const nodes: AudioNode[] = []
  const now = ctx.currentTime

  if (theme === "cafe") {
    // 咖啡馆 — 低沉环境音 + 轻柔杯碟声
    const brownNoise = createNoiseBuffer(ctx, 8, (i) => {
      let sample = Math.random() * 2 - 1
      // 简易布朗噪声：累积随机偏移
      return Math.tanh(sample * 0.3)
    })
    const noiseSrc = ctx.createBufferSource()
    noiseSrc.buffer = brownNoise
    noiseSrc.loop = true
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = "lowpass"
    noiseFilter.frequency.value = 350
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.04
    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(ctx.destination)
    noiseSrc.start(now)
    nodes.push(noiseSrc, noiseFilter, noiseGain)

    // 偶尔的瓷杯轻碰声
    const chimeInterval = setInterval(() => {
      if (ctx.state !== "running") return
      const osc = ctx.createOscillator()
      osc.type = "sine"
      osc.frequency.value = 1800 + Math.random() * 600
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, ctx.currentTime)
      g.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.005)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.connect(g).connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.35)
    }, 4000 + Math.random() * 6000)

    return {
      nodes,
      cleanup: () => clearInterval(chimeInterval),
    }
  }

  if (theme === "waves") {
    // 海浪 — 粉红噪声低频滤波
    const pinkNoise = createNoiseBuffer(ctx, 8, () => {
      // 简易粉噪
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      return (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    })

    const noiseSrc = ctx.createBufferSource()
    noiseSrc.buffer = pinkNoise
    noiseSrc.loop = true
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = "lowpass"
    noiseFilter.frequency.value = 500
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.12
    // 音量起伏模拟潮汐
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.08
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.03
    lfo.connect(lfoGain).connect(noiseGain.gain)
    lfo.start(now)

    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(ctx.destination)
    noiseSrc.start(now)
    nodes.push(noiseSrc, noiseFilter, noiseGain, lfo, lfoGain)

    return { nodes, cleanup: () => {} }
  }

  if (theme === "forest") {
    // 森林 — 轻柔风声 + 鸟鸣
    const windNoise = createNoiseBuffer(ctx, 8)
    const windSrc = ctx.createBufferSource()
    windSrc.buffer = windNoise
    windSrc.loop = true
    const windFilter = ctx.createBiquadFilter()
    windFilter.type = "bandpass"
    windFilter.frequency.value = 600
    windFilter.Q.value = 0.5
    const windGain = ctx.createGain()
    windGain.gain.value = 0.03
    windSrc.connect(windFilter).connect(windGain).connect(ctx.destination)
    windSrc.start(now)
    nodes.push(windSrc, windFilter, windGain)

    // 随机鸟鸣
    const birdInterval = setInterval(() => {
      if (ctx.state !== "running") return
      const osc = ctx.createOscillator()
      osc.type = "sine"
      const baseFreq = 2000 + Math.random() * 2500
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(baseFreq * 1.3, ctx.currentTime + 0.08)
      osc.frequency.linearRampToValueAtTime(baseFreq * 0.85, ctx.currentTime + 0.16)
      osc.frequency.linearRampToValueAtTime(baseFreq, ctx.currentTime + 0.22)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, ctx.currentTime)
      g.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.connect(g).connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.35)
    }, 2000 + Math.random() * 4000)

    return {
      nodes,
      cleanup: () => clearInterval(birdInterval),
    }
  }

  if (theme === "rain") {
    // 雨声 — 高频噪声滤波
    const rainNoise = createNoiseBuffer(ctx, 8)
    const rainSrc = ctx.createBufferSource()
    rainSrc.buffer = rainNoise
    rainSrc.loop = true
    const rainFilter = ctx.createBiquadFilter()
    rainFilter.type = "bandpass"
    rainFilter.frequency.value = 3000
    rainFilter.Q.value = 0.8
    const rainGain = ctx.createGain()
    rainGain.gain.value = 0.08
    rainSrc.connect(rainFilter).connect(rainGain).connect(ctx.destination)
    rainSrc.start(now)
    nodes.push(rainSrc, rainFilter, rainGain)

    return { nodes, cleanup: () => {} }
  }

  if (theme === "city") {
    // 城市 — 低沉嗡嗡声
    const cityNoise = createNoiseBuffer(ctx, 8)
    const citySrc = ctx.createBufferSource()
    citySrc.buffer = cityNoise
    citySrc.loop = true
    const cityFilter = ctx.createBiquadFilter()
    cityFilter.type = "lowpass"
    cityFilter.frequency.value = 200
    const cityGain = ctx.createGain()
    cityGain.gain.value = 0.025
    citySrc.connect(cityFilter).connect(cityGain).connect(ctx.destination)
    citySrc.start(now)
    nodes.push(citySrc, cityFilter, cityGain)

    return { nodes, cleanup: () => {} }
  }

  if (theme === "night") {
    // 夜晚 — 极轻柔的低频 + 蟋蟀声
    const nightNoise = createNoiseBuffer(ctx, 8)
    const nightSrc = ctx.createBufferSource()
    nightSrc.buffer = nightNoise
    nightSrc.loop = true
    const nightFilter = ctx.createBiquadFilter()
    nightFilter.type = "bandpass"
    nightFilter.frequency.value = 4000
    nightFilter.Q.value = 2
    const nightGain = ctx.createGain()
    nightGain.gain.value = 0.015
    nightSrc.connect(nightFilter).connect(nightGain).connect(ctx.destination)
    nightSrc.start(now)
    nodes.push(nightSrc, nightFilter, nightGain)

    return { nodes, cleanup: () => {} }
  }

  return { nodes: [], cleanup: () => {} }
}

export default function AmbientSound({ name, moodTags, ambientSoundUrl }: Props) {
  const [playing, setPlaying] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const theme = detectSoundTheme(name, moodTags)

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
      ctxRef.current?.close()
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  const toggle = useCallback(() => {
    if (playing) {
      cleanupRef.current?.()
      cleanupRef.current = null
      ctxRef.current?.close()
      ctxRef.current = null
      audioRef.current?.pause()
      audioRef.current = null
      setPlaying(false)
    } else if (ambientSoundUrl) {
      const audio = new Audio(ambientSoundUrl)
      audio.loop = true
      audio.play().catch(() => {})
      audioRef.current = audio
      setPlaying(true)
    } else {
      const ctx = new AudioContext()
      ctxRef.current = ctx
      const { cleanup } = setupSoundscape(ctx, theme)
      cleanupRef.current = cleanup
      setPlaying(true)
    }
  }, [playing, theme, ambientSoundUrl])

  return (
    <button
      onClick={toggle}
      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm
                 backdrop-blur-sm transition-all active:scale-95
                 ${playing
                   ? "bg-rose/30 text-rose shadow-sm"
                   : "bg-soft-white/80 text-warm-gray"
                 }`}
      title={playing ? "关闭环境音" : "播放环境音"}
    >
      {playing ? "🔊" : "🔈"}
    </button>
  )
}
