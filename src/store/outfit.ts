import { create } from 'zustand'
import type { OutfitState, ClothingItem, AIOutfitPlan, SavedInspiration } from '@/types'

type SingleSlot = 'dress' | 'top' | 'bottom' | 'outerwear' | 'shoes' | 'bag'

interface GenRecord {
  id: string
  imageUrl: string
  prompt: string
  mode: string
  sceneId?: string | null
  gender?: "female" | "male" | null
  createdAt: number
}

interface SavedOutfit {
  id: string
  name: string
  outfit: OutfitState
  sceneId?: string | null
  gender?: "female" | "male" | null
  createdAt: number
}

interface OutfitStore {
  // 当前搭配状态
  outfit: OutfitState
  // 操作历史（撤销用）
  history: OutfitState[]
  // 生成历史（最近 N 条）
  generationHistory: GenRecord[]
  // 保存的搭配方案
  savedOutfits: SavedOutfit[]
  // AI 推荐单品的临时缓存
  aiItemsCache: Record<string, ClothingItem>
  // 收藏的灵感方案
  savedInspirations: SavedInspiration[]
  // 设置单值槽位的单品
  setSlot: (slot: SingleSlot, itemId: string) => void
  // 添加配饰
  addAccessory: (itemId: string) => void
  // 移除某槽位的单品
  removeSlot: (slot: SingleSlot | 'accessories', itemId?: string) => void
  // 清空全部
  clearAll: () => void
  // 撤销
  undo: () => void
  // 一键穿戴整套
  wearSet: (items: { slot: string; itemId: string }[]) => void
  // 添加生成记录
  addGenRecord: (record: Omit<GenRecord, 'id' | 'createdAt'>) => void
  // 保存搭配方案（sceneId 用于按场景隔离记录，gender 用于按性别隔离）
  saveOutfit: (name: string, sceneId?: string | null, gender?: "female" | "male" | null) => void
  // 删除保存的方案
  deleteOutfit: (id: string) => void
  // 加载保存的方案
  loadOutfit: (id: string) => void
  // 客户端初始化：从 localStorage 恢复数据
  initFromStorage: () => void
  // 跨设备同步：合并服务端方案到本地
  mergeOutfits: (serverOutfits: SavedOutfit[]) => void
  // AI 单品缓存
  addAIItems: (items: ClothingItem[]) => void
  getAIItem: (id: string) => ClothingItem | undefined
  // 灵感收藏
  saveInspiration: (plan: AIOutfitPlan) => void
  removeInspiration: (id: string) => void
}

const EMPTY_OUTFIT: OutfitState = {
  dress: null,
  top: null,
  bottom: null,
  outerwear: null,
  shoes: null,
  bag: null,
  accessories: [],
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// localStorage 持久化生成历史和保存方案
function loadFromStorage(): { generationHistory: GenRecord[]; savedOutfits: SavedOutfit[] } {
  if (typeof window === 'undefined') return { generationHistory: [], savedOutfits: [] }
  try {
    const gh = JSON.parse(localStorage.getItem('sd_gen_history') || '[]')
    const so = JSON.parse(localStorage.getItem('sd_saved_outfits') || '[]')
    return { generationHistory: gh, savedOutfits: so }
  } catch {
    return { generationHistory: [], savedOutfits: [] }
  }
}

function saveToStorage(key: string, data: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch { /* quota exceeded, ignore */ }
}

// 延迟读取 localStorage，避免 SSR/客户端 hydration 不匹配
let lazyPersisted: { generationHistory: GenRecord[]; savedOutfits: SavedOutfit[] } | null = null
function getPersisted() {
  if (!lazyPersisted) lazyPersisted = loadFromStorage()
  return lazyPersisted
}

// 保存后刷新缓存，确保 initFromStorage 读到最新数据
function refreshPersisted() {
  lazyPersisted = loadFromStorage()
}

export const useOutfitStore = create<OutfitStore>((set, get) => ({
  outfit: { ...EMPTY_OUTFIT },
  history: [],
  generationHistory: [],
  savedOutfits: [],
  aiItemsCache: {},
  savedInspirations: [],

  setSlot: (slot, itemId) => {
    set((state) => {
      const prevState = { ...state.outfit }

      if (slot === 'dress' && itemId) {
        return {
          outfit: {
            ...state.outfit,
            dress: itemId,
            top: null,
            bottom: null,
          },
          history: [...state.history, prevState].slice(-20),
        }
      }

      if ((slot === 'top' || slot === 'bottom') && itemId && state.outfit.dress) {
        return {
          outfit: {
            ...state.outfit,
            [slot]: itemId,
            dress: null,
          },
          history: [...state.history, prevState].slice(-20),
        }
      }

      return {
        outfit: { ...state.outfit, [slot]: itemId },
        history: [...state.history, prevState].slice(-20),
      }
    })
  },

  addAccessory: (itemId) => {
    set((state) => {
      const prevState = { ...state.outfit }
      return {
        outfit: {
          ...state.outfit,
          accessories: [...state.outfit.accessories, itemId],
        },
        history: [...state.history, prevState].slice(-20),
      }
    })
  },

  removeSlot: (slot, itemId) => {
    set((state) => {
      const prevState = { ...state.outfit }
      if (slot === 'accessories' && itemId) {
        return {
          outfit: {
            ...state.outfit,
            accessories: state.outfit.accessories.filter((id) => id !== itemId),
          },
          history: [...state.history, prevState].slice(-20),
        }
      }
      return {
        outfit: { ...state.outfit, [slot]: null },
        history: [...state.history, prevState].slice(-20),
      }
    })
  },

  clearAll: () => {
    set((state) => ({
      outfit: { ...EMPTY_OUTFIT },
      history: [...state.history, { ...state.outfit }].slice(-20),
    }))
  },

  undo: () => {
    set((state) => {
      if (state.history.length === 0) return state
      const prev = state.history[state.history.length - 1]
      return {
        outfit: prev,
        history: state.history.slice(0, -1),
      }
    })
  },

  wearSet: (items) => {
    set((state) => {
      const prevState = { ...state.outfit }
      const newOutfit: OutfitState = {
        dress: null,
        top: null,
        bottom: null,
        outerwear: null,
        shoes: null,
        bag: null,
        accessories: [],
      }
      for (const { slot, itemId } of items) {
        if (slot === 'accessories') {
          newOutfit.accessories = [...newOutfit.accessories, itemId]
        } else if (slot === 'dress') newOutfit.dress = itemId
        else if (slot === 'top') newOutfit.top = itemId
        else if (slot === 'bottom') newOutfit.bottom = itemId
        else if (slot === 'outerwear') newOutfit.outerwear = itemId
        else if (slot === 'shoes') newOutfit.shoes = itemId
        else if (slot === 'bag') newOutfit.bag = itemId
      }
      return {
        outfit: newOutfit,
        history: [...state.history, prevState].slice(-20),
      }
    })
  },

  addGenRecord: (record) => {
    set((state) => {
      const newRecord: GenRecord = { ...record, id: genId(), createdAt: Date.now() }
      const updated = [newRecord, ...state.generationHistory].slice(0, 20)
      saveToStorage('sd_gen_history', updated)
      refreshPersisted()
      return { generationHistory: updated }
    })
  },

  saveOutfit: (name, sceneId, gender) => {
    set((state) => {
      const saved: SavedOutfit = {
        id: genId(),
        name,
        outfit: { ...state.outfit },
        sceneId: sceneId ?? null,
        gender: gender ?? null,
        createdAt: Date.now(),
      }
      const updated = [saved, ...state.savedOutfits].slice(0, 30)
      saveToStorage('sd_saved_outfits', updated)
      refreshPersisted()
      return { savedOutfits: updated }
    })
  },

  deleteOutfit: (id) => {
    set((state) => {
      const updated = state.savedOutfits.filter((s) => s.id !== id)
      saveToStorage('sd_saved_outfits', updated)
      refreshPersisted()
      return { savedOutfits: updated }
    })
  },

  loadOutfit: (id) => {
    const saved = get().savedOutfits.find((s) => s.id === id)
    if (!saved) return
    set({ outfit: { ...saved.outfit } })
  },

  initFromStorage: () => {
    // 每次挂载都从 localStorage 直接读取，不用模块级缓存
    const p = loadFromStorage()
    lazyPersisted = p
    let inspirations: SavedInspiration[] = []
    if (typeof window !== 'undefined') {
      try { inspirations = JSON.parse(localStorage.getItem('sd_inspirations') || '[]').slice(0, 50) } catch {}
    }
    set({
      generationHistory: p.generationHistory.slice(0, 20),
      savedOutfits: p.savedOutfits.slice(0, 30),
      savedInspirations: inspirations,
    })
  },

  mergeOutfits: (serverOutfits) => {
    set((state) => {
      const existingKeys = new Set(state.savedOutfits.map((s) => `${s.name}__${s.sceneId}`))
      const newOnes = serverOutfits.filter((s) => !existingKeys.has(`${s.name}__${s.sceneId}`))
      if (newOnes.length === 0) return state
      const merged = [...newOnes, ...state.savedOutfits].slice(0, 30)
      saveToStorage('sd_saved_outfits', merged)
      refreshPersisted()
      return { savedOutfits: merged }
    })
  },

  addAIItems: (items) => {
    set((state) => {
      const next = { ...state.aiItemsCache }
      for (const item of items) {
        next[item.id] = item
      }
      return { aiItemsCache: next }
    })
  },

  getAIItem: (id) => {
    return get().aiItemsCache[id]
  },

  saveInspiration: (plan) => {
    set((state) => {
      const saved: SavedInspiration = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        plan,
        createdAt: new Date().toISOString(),
      }
      const updated = [saved, ...state.savedInspirations].slice(0, 50)
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('sd_inspirations', JSON.stringify(updated)) } catch {}
      }
      return { savedInspirations: updated }
    })
  },

  removeInspiration: (id) => {
    set((state) => {
      const updated = state.savedInspirations.filter((s) => s.id !== id)
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('sd_inspirations', JSON.stringify(updated)) } catch {}
      }
      return { savedInspirations: updated }
    })
  },
}))
