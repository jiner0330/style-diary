"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Scene } from "@/types"
import SceneIllustration from "@/components/scene/SceneIllustration"
import AmbientSound from "@/components/scene/AmbientSound"
import { enrichScene } from "@/lib/scene-assets"
import toast from "react-hot-toast"

export default function SceneDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [scene, setScene] = useState<Scene | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("scenes")
        .select("*")
        .eq("id", id)
        .single()

      if (error || !data) {
        toast.error("场景不存在")
        router.push("/scenes")
        return
      }
      setScene(enrichScene(data))
      setLoading(false)
    }
    if (id) load()
  }, [id, router])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-warm-gray animate-pulse">正在进入场景...</p>
      </div>
    )
  }

  if (!scene) return null

  return (
    <div className="flex flex-col flex-1">
      {/* 顶部氛围插画 */}
      <div className="relative overflow-hidden">
        <SceneIllustration name={scene.name} moodTags={scene.mood_tags || []} illustrationUrl={scene.illustration_url} />
        {/* 场景名叠加 */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        <h1 className="absolute bottom-4 left-5 text-xl font-semibold text-white tracking-wide drop-shadow-md">
          {scene.name}
        </h1>
        <div className="absolute top-4 right-4 z-10">
          <AmbientSound name={scene.name} moodTags={scene.mood_tags || []} ambientSoundUrl={scene.ambient_sound_url} />
        </div>
      </div>

      {/* 前情提要 */}
      <div className="flex-1 px-6 py-8 space-y-8">
        <div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {scene.mood_tags?.map(tag => (
              <span key={tag} className="text-xs text-warm-gray bg-cream/50
                                         px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          <p className="text-lg leading-8 text-charcoal/80 tracking-wide">
            {scene.story_text}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          <button
            onClick={() => router.push(`/dressing?id=${scene.id}`)}
            className="w-full py-4 rounded-2xl bg-charcoal text-soft-white font-medium
                       tracking-wide transition-all active:scale-[0.98]
                       text-lg"
          >
            开始搭配
          </button>
        </div>
      </div>
    </div>
  )
}
