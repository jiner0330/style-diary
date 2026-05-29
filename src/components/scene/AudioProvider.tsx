"use client"

import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react"

interface AudioState {
  isPlaying: boolean
  currentUrl: string | null
  play: (url: string) => void
  stop: () => void
}

const AudioCtx = createContext<AudioState>({
  isPlaying: false,
  currentUrl: null,
  play: () => {},
  stop: () => {},
})

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)

  const stop = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    setIsPlaying(false)
    setCurrentUrl(null)
  }, [])

  const play = useCallback((url: string) => {
    audioRef.current?.pause()
    const audio = new Audio(url)
    audio.loop = true
    audio.preload = "auto"
    audio.play().catch(err => console.warn("环境音播放失败:", err))
    audioRef.current = audio
    setIsPlaying(true)
    setCurrentUrl(url)
  }, [])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  return (
    <AudioCtx.Provider value={{ isPlaying, currentUrl, play, stop }}>
      {children}
    </AudioCtx.Provider>
  )
}

export function useAudio() {
  return useContext(AudioCtx)
}
