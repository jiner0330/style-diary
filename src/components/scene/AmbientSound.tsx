"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useAudio } from "./AudioProvider"

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
    const brownNoise = createNoiseBuffer(ctx, 8, () => Math.tanh((Math.random() * 2 - 1) * 0.3))
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

    return { nodes, cleanup: () => clearInterval(chimeInterval) }
  }

  if (theme === "waves") {
    const pinkNoise = createNoiseBuffer(ctx, 8, () => {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
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

    return { nodes, cleanup: () => clearInterval(birdInterval) }
  }

  if (theme === "rain") {
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
  const { isPlaying, currentUrl, play, stop } = useAudio()
  const isThisPlaying = !!(ambientSoundUrl && isPlaying && currentUrl === ambientSoundUrl)

  // 合成音频 fallback（无 MP3 时）
  const [synthPlaying, setSynthPlaying] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const theme = detectSoundTheme(name, moodTags)

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
      ctxRef.current?.close()
    }
  }, [])

  const toggleSynth = useCallback(() => {
    if (synthPlaying) {
      cleanupRef.current?.()
      cleanupRef.current = null
      ctxRef.current?.close()
      ctxRef.current = null
      setSynthPlaying(false)
    } else {
      const ctx = new AudioContext()
      ctxRef.current = ctx
      const { cleanup } = setupSoundscape(ctx, theme)
      cleanupRef.current = cleanup
      setSynthPlaying(true)
    }
  }, [synthPlaying, theme])

  const toggle = () => {
    if (ambientSoundUrl) {
      isThisPlaying ? stop() : play(ambientSoundUrl)
    } else {
      toggleSynth()
    }
  }

  const active = ambientSoundUrl ? isThisPlaying : synthPlaying

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium
                 backdrop-blur-sm transition-all active:scale-95
                 ${active
                   ? "bg-rose/25 text-rose shadow-sm"
                   : "bg-soft-white/80 text-warm-gray hover:bg-soft-white"
                 }`}
    >
      <span>{active ? "🔊" : "🔈"}</span>
      <span>{active ? "关闭" : "环境音"}</span>
    </button>
  )
}
