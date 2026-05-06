"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { Scene } from "@/types"
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
      setScene(data)
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
      <div className="w-full h-64 bg-cream/50 flex items-center justify-center text-6xl
                      relative overflow-hidden">
        {scene.mood_tags?.[0] === '松弛' && '🥂'}
        {scene.mood_tags?.[0] === '安静' && '📖'}
        {scene.mood_tags?.[0] === '自信' && '💼'}
        {scene.mood_tags?.[0] === '期待' && '💕'}
        {scene.mood_tags?.[0] === '表达' && '🎨'}
        {scene.mood_tags?.[0] === '自由' && '🌊'}
        {scene.mood_tags?.[0] === '释然' && '✨'}
        {/* 场景环境音占位 */}
        <button
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-soft-white/80
                     flex items-center justify-center text-sm text-warm-gray
                     backdrop-blur-sm"
          title="环境音"
        >
          🔊
        </button>
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
            onClick={() => router.push(`/dressing?id=${scene.id}&mode=ai`)}
            className="w-full py-4 rounded-2xl bg-rose text-soft-white font-medium
                       tracking-wide transition-all active:scale-[0.98]
                       text-lg"
          >
            让小裁帮我搭配
          </button>

          <button
            onClick={() => router.push(`/dressing?id=${scene.id}&mode=manual`)}
            className="w-full py-4 rounded-2xl border border-warm-gray text-charcoal
                       font-medium tracking-wide transition-all active:scale-[0.98]"
          >
            我自己搭配
          </button>
        </div>
      </div>
    </div>
  )
}
