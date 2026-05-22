import { create } from 'zustand'
import type { OutfitState } from '@/types'

type SingleSlot = 'dress' | 'top' | 'bottom' | 'outerwear' | 'shoes' | 'bag'

interface GenRecord {
  id: string
  imageUrl: string
  prompt: string
  mode: string
  createdAt: number
}

interface SavedOutfit {
  id: string
  name: string
  outfit: OutfitState
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
  // 保存搭配方案
  saveOutfit: (name: string) => void
  // 删除保存的方案
  deleteOutfit: (id: string) => void
  // 加载保存的方案
  loadOutfit: (id: string) => void
  // 客户端初始化：从 localStorage 恢复数据
  initFromStorage: () => void
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
  if (lazyPersisted) return lazyPersisted
  lazyPersisted = loadFromStorage()
  return lazyPersisted
}

export const useOutfitStore = create<OutfitStore>((set, get) => ({
  outfit: { ...EMPTY_OUTFIT },
  history: [],
  generationHistory: [],
  savedOutfits: [],

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
      return { generationHistory: updated }
    })
  },

  saveOutfit: (name) => {
    set((state) => {
      const saved: SavedOutfit = {
        id: genId(),
        name,
        outfit: { ...state.outfit },
        createdAt: Date.now(),
      }
      const updated = [saved, ...state.savedOutfits].slice(0, 30)
      saveToStorage('sd_saved_outfits', updated)
      return { savedOutfits: updated }
    })
  },

  deleteOutfit: (id) => {
    set((state) => {
      const updated = state.savedOutfits.filter((s) => s.id !== id)
      saveToStorage('sd_saved_outfits', updated)
      return { savedOutfits: updated }
    })
  },

  loadOutfit: (id) => {
    const saved = get().savedOutfits.find((s) => s.id === id)
    if (!saved) return
    set({ outfit: { ...saved.outfit } })
  },

  initFromStorage: () => {
    const p = getPersisted()
    set({
      generationHistory: p.generationHistory.slice(0, 20),
      savedOutfits: p.savedOutfits.slice(0, 30),
    })
  },
}))
