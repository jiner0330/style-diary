"use client"

import { useState, useEffect, useCallback } from "react"
import { getAuthToken } from "@/lib/supabase"
import { registerPersonalItems, removePersonalItem } from "@/lib/mock-data"
import { useOutfitStore } from "@/store/outfit"
import type { ClothingItem } from "@/types"

// 游客衣橱在 localStorage 里的 key（登录前先体验，登录后同步到云端）
export const GUEST_WARDROBE_KEY = "sd_guest_wardrobe"

// 模块级缓存：跨组件挂载保持，避免每次都从 loading 骨架开始
let cachedItems: ClothingItem[] | null = null

/** 从模块级缓存查找单品（不依赖 React state，可在任何地方同步调用） */
export function getCachedWardrobeItem(id: string): ClothingItem | undefined {
  return cachedItems?.find((i) => i.id === id)
}

/** 获取模块级缓存的全部衣橱单品 */
export function getCachedWardrobeItems(): ClothingItem[] {
  return cachedItems || []
}

/** 读游客本地衣橱 */
function readGuestWardrobe(): ClothingItem[] {
  try {
    return JSON.parse(localStorage.getItem(GUEST_WARDROBE_KEY) || "[]") as ClothingItem[]
  } catch {
    return []
  }
}

/** 游客上传后，把新单品写入本地衣橱（置顶） */
export function saveGuestItem(item: ClothingItem) {
  try {
    const items = readGuestWardrobe()
    localStorage.setItem(GUEST_WARDROBE_KEY, JSON.stringify([item, ...items]))
  } catch {}
}

/** 登录后把游客本地衣橱迁移到云端，成功则清空本地（不阻塞主流程） */
async function migrateGuestWardrobe(token: string) {
  const guestItems = readGuestWardrobe()
  if (guestItems.length === 0) return
  try {
    const res = await fetch("/api/wardrobe/migrate", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ items: guestItems }),
    })
    if (res.ok) {
      localStorage.removeItem(GUEST_WARDROBE_KEY)
    }
  } catch (e) {
    console.warn("[usePersonalWardrobe] migrate guest wardrobe failed:", e)
  }
}

export function usePersonalWardrobe() {
  const [items, setItems] = useState<ClothingItem[]>(cachedItems || [])
  const [loading, setLoading] = useState(!cachedItems)

  const fetchItems = useCallback(async () => {
    try {
      const token = await getAuthToken()
      if (!token) {
        // 游客：读 localStorage 本地衣橱
        const guestItems = readGuestWardrobe()
        cachedItems = guestItems
        setItems(guestItems)
        if (guestItems.length > 0) registerPersonalItems(guestItems)
        setLoading(false)
        return
      }
      // 登录态：先把游客期间上传的本地衣橱迁移到云端
      await migrateGuestWardrobe(token)
      const res = await fetch("/api/wardrobe", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setItems([])
        setLoading(false)
        return
      }
      const data = await res.json()
      const fetched: ClothingItem[] = data.items || []
      // 排查 pattern 字段丢失：检查 API 返回的第一条数据
      if (fetched.length > 0) {
        const sample = fetched[0]
        console.log(`[usePersonalWardrobe] fetched ${fetched.length} items, first: name=${sample.name} pattern="${sample.pattern}" detail="${sample.detail}"`)
      }
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
    if (!token) {
      // 游客：从 localStorage 移除
      try {
        localStorage.setItem(GUEST_WARDROBE_KEY, JSON.stringify(readGuestWardrobe().filter((i) => i.id !== id)))
      } catch {}
    } else {
      const res = await fetch(`/api/wardrobe?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return false
    }
    // 共同：从缓存、统一查找表和状态中移除
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
