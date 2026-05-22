"use client"

import { useState, useEffect, useCallback } from "react"
import { getAuthToken } from "@/lib/supabase"
import { registerPersonalItems } from "@/lib/mock-data"
import type { ClothingItem } from "@/types"

export function usePersonalWardrobe() {
  const [items, setItems] = useState<ClothingItem[]>([])
  const [loading, setLoading] = useState(true)

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
      setItems(fetched)
      // 注册到统一查找表
      if (fetched.length > 0) registerPersonalItems(fetched)
    } catch (err) {
      console.warn("[usePersonalWardrobe] fetch failed:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return { items, loading, refresh: fetchItems }
}
