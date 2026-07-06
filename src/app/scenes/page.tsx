"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import type { Scene } from "@/types"
import SceneIllustration from "@/components/scene/SceneIllustration"
import toast from "react-hot-toast"

export default function ScenesPage() {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [completedCount, setCompletedCount] = useState(0)
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

      // 收集已参与的场景：生图记录（localStorage）+ 保存记录（Supabase）
      const engagedScenes = new Set<string>()

      // 1. 从 localStorage 生图记录中提取场景
      if (typeof window !== "undefined") {
        try {
          const gh = JSON.parse(localStorage.getItem("sd_gen_history") || "[]")
          gh.forEach((g: any) => { if (g.sceneId) engagedScenes.add(g.sceneId) })
        } catch { /* ignore */ }
      }

      // 2. 登录用户额外计入 Supabase 中的保存记录
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: outfits, error: outfitsErr } = await supabase
            .from("outfits")
            .select("scene_id")
            .eq("user_id", user.id)

          if (!outfitsErr && outfits) {
            outfits.forEach((o) => { if (o.scene_id) engagedScenes.add(o.scene_id) })
          }
        }
      } catch { /* guest — skip */ }

      setCompletedCount(engagedScenes.size)
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
        {scenes.map((scene) => {
          const unlocked = completedCount >= scene.unlock_condition
          return (
            <div key={scene.id} className="relative">
              {unlocked ? (
                <Link href={`/scenes/${scene.id}`}>
                  <SceneCard scene={scene} />
                </Link>
              ) : (
                <div className="opacity-50 cursor-not-allowed">
                  <SceneCard scene={scene} />
                  <div className="absolute inset-0 flex items-center justify-center
                                  bg-soft-white/60 rounded-2xl">
                    <div className="text-center">
                      <span className="text-2xl">🔒</span>
                      <p className="text-xs text-warm-gray mt-1">
                        完成 {scene.unlock_condition} 个场景后解锁
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
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
