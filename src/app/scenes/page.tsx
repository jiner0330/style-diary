"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import type { Scene } from "@/types"
import toast from "react-hot-toast"

export default function ScenesPage() {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [completedCount, setCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // 加载所有场景
        const { data: scenesData, error: scenesErr } = await supabase
          .from("scenes")
          .select("*")
          .order("sort_order")

        if (scenesErr) throw scenesErr
        setScenes(scenesData || [])

        // 获取已完成的场景数
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: outfits, error: outfitsErr } = await supabase
            .from("outfits")
            .select("scene_id")
            .eq("user_id", user.id)

          if (!outfitsErr && outfits) {
            const uniqueScenes = new Set(outfits.map(o => o.scene_id))
            setCompletedCount(uniqueScenes.size)
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "加载失败"
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-warm-gray animate-pulse">小裁正在准备场景...</p>
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
      <div className="w-full aspect-[3/4] rounded-xl bg-cream/50 mb-3
                      flex items-center justify-center text-3xl">
        {/* 场景插画占位——后续用 Midjourney 生成 */}
        {scene.mood_tags?.[0] === '松弛' && '🥂'}
        {scene.mood_tags?.[0] === '安静' && '📖'}
        {scene.mood_tags?.[0] === '自信' && '💼'}
        {scene.mood_tags?.[0] === '期待' && '💕'}
        {scene.mood_tags?.[0] === '表达' && '🎨'}
        {scene.mood_tags?.[0] === '自由' && '🌊'}
        {scene.mood_tags?.[0] === '释然' && '✨'}
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
