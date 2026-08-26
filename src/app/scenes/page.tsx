"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import type { Scene } from "@/types"
import SceneIllustration from "@/components/scene/SceneIllustration"
import toast from "react-hot-toast"

export default function ScenesPage() {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadScenes = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      // 通过服务端 API 代理加载场景（更快更可靠）
      const res = await fetch("/api/scenes")
      if (!res.ok) throw new Error("场景加载失败")
      const data = await res.json()
      setScenes(data.scenes || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "加载失败"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadScenes()
  }, [loadScenes])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-warm-gray animate-pulse">搭搭正在准备场景...</p>
      </div>
    )
  }

  if (error && scenes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-charcoal">场景加载失败</p>
        <p className="text-xs text-warm-gray">{error}</p>
        <button
          onClick={loadScenes}
          className="px-6 py-2 rounded-xl bg-rose text-soft-white text-sm"
          style={{ touchAction: "manipulation" }}
        >
          点击重试
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 px-4 py-8 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold text-charcoal tracking-wider">
          Hi，今天是什么日子？
        </h1>
        <p className="text-sm text-warm-gray">
          选择一个场景，开始你的搭配
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {scenes.map((scene) => (
          <Link key={scene.id} href={`/scenes/${scene.id}`}>
            <SceneCard scene={scene} />
          </Link>
        ))}
      </div>
    </div>
  )
}

function SceneCard({ scene }: { scene: Scene }) {
  return (
    <div className="rounded-2xl bg-white/60 border border-warm-gray/30 p-4
                    h-full hover:border-rose/30 transition-colors">
      <div className="w-full aspect-[3/4] rounded-xl overflow-hidden mb-3">
        <SceneIllustration name={scene.name} moodTags={scene.mood_tags || []} variant="card" illustrationUrl={scene.illustration_url} />
      </div>
      <h3 className="font-medium text-charcoal text-sm">{scene.name}</h3>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {scene.mood_tags?.map(tag => (
          <span key={tag} className="text-[10px] text-warm-gray bg-cream/50
                                     px-2 py-0.5 rounded-full">
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
