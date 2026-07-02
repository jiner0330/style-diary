"use client"

import { useState, useEffect, useCallback } from "react"
import { getAuthToken } from "@/lib/supabase"
import { registerPersonalItems, removePersonalItem } from "@/lib/mock-data"
import { useOutfitStore } from "@/store/outfit"
import type { ClothingItem } from "@/types"

// 模块级缓存：跨组件挂载保持，避免每次都从 loading 骨架开始
let cachedItems: ClothingItem[] | null = null

export function usePersonalWardrobe() {
  const [items, setItems] = useState<ClothingItem[]>(cachedItems || [])
  const [loading, setLoading] = useState(!cachedItems)

  const fetchItems = useCallback(async () => {
    try {
      const token = await getAuthToken()
      if (!token) {
        setItems([])
        setLoading(false)
        return
      }
      const res = await fetch("/api/wardrobe", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setItems([])
        setLoading(false)
        return
      }
      const data = await res.json()
      const fetched = data.items || []
      cachedItems = fetched
      setItems(fetched)
      // 注册到统一查找表
      if (fetched.length > 0) registerPersonalItems(fetched)
    } catch (err) {
      console.warn("[usePersonalWardrobe] fetch failed:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteItem = useCallback(async (id: string) => {
    const token = await getAuthToken()
    if (!token) return false
    const res = await fetch(`/api/wardrobe?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return false
    // 从缓存、统一查找表和状态中移除
    removePersonalItem(id)
    cachedItems = cachedItems?.filter((i) => i.id !== id) || null
    setItems((prev) => prev.filter((i) => i.id !== id))
    // 同步清除 AI 缓存：避免 collectItems 通过 aiCache 捡回已删除的旧数据
    const { [id]: _, ...rest } = useOutfitStore.getState().aiItemsCache
    useOutfitStore.setState({ aiItemsCache: rest })
    return true
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return { items, loading, refresh: fetchItems, deleteItem }
}
