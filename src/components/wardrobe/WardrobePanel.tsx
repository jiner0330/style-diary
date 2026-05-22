"use client"

import { useState, useEffect } from "react"
import { useOutfitStore } from "@/store/outfit"
import { getItemsByCategory } from "@/lib/mock-data"
import { CATEGORY_LABELS } from "@/lib/utils"
import ClothingCard from "./ClothingCard"
import type { ClothingCategory, ClothingItem } from "@/types"

const CATEGORIES: ClothingCategory[] = ["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory"]
const itemsByCategory = getItemsByCategory()

interface Props {
  isDrawerOpen?: boolean
  onClose?: () => void
  pendingCategory?: string | null
  onItemClick?: (item: ClothingItem) => void
  onUndo?: () => void
  onClearAll?: () => void
  hasHistory?: boolean
}

export default function WardrobePanel({ isDrawerOpen, onClose, pendingCategory, onItemClick, onUndo, onClearAll, hasHistory }: Props) {
  const [activeTab, setActiveTab] = useState<ClothingCategory>("top")
  const outfit = useOutfitStore((s) => s.outfit)

  useEffect(() => {
    if (pendingCategory && CATEGORIES.includes(pendingCategory as ClothingCategory)) {
      setActiveTab(pendingCategory as ClothingCategory)
    }
  }, [pendingCategory])

  function isEquipped(itemId: string): boolean {
    if (outfit.dress === itemId) return true
    if (outfit.top === itemId) return true
    if (outfit.bottom === itemId) return true
    if (outfit.outerwear === itemId) return true
    if (outfit.shoes === itemId) return true
    if (outfit.bag === itemId) return true
    if (outfit.accessories.includes(itemId)) return true
    return false
  }

  const systemItems = itemsByCategory[activeTab] || []

  const content = (
    <div className="h-full flex flex-col">
      {/* 标题 + 操作按钮 */}
      <div className="px-3 py-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-charcoal">系统衣橱</h3>
        <div className="flex items-center gap-1">
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!hasHistory}
              className="text-[11px] px-2 py-1 rounded-full text-warm-gray hover:text-rose hover:bg-rose/5
                         transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ↩ 撤销
            </button>
          )}
          {onClearAll && (
            <button
              onClick={onClearAll}
              className="text-[11px] px-2 py-1 rounded-full text-warm-gray hover:text-rose hover:bg-rose/5
                         transition-colors"
            >
              清空
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-warm-gray hover:text-rose text-sm ml-1">
              收起
            </button>
          )}
        </div>
      </div>

      {/* 品类 Tab */}
      <div className="flex flex-wrap gap-1.5 px-3 pb-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-4 py-2 rounded-full text-xs whitespace-nowrap transition-[background-color,color,box-shadow]
              ${activeTab === cat
                ? "bg-rose text-soft-white shadow-sm"
                : "bg-cream/50 text-warm-gray hover:bg-rose/10 hover:text-rose"
              }`}
          >
            {CATEGORY_LABELS[cat]}
            <span className="ml-1 opacity-60">{itemsByCategory[cat]?.length || 0}</span>
          </button>
        ))}
      </div>

      {/* 单品展示区 */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-3 gap-2">
          {systemItems.map((item) => (
            <ClothingCard
              key={item.id}
              item={item}
              isEquipped={isEquipped(item.id)}
              clickToAdd={!!pendingCategory}
              onQuickAdd={onItemClick}
            />
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* 桌面版 */}
      <div className="hidden md:block h-full w-full overflow-hidden bg-soft-white/80">
        {content}
      </div>

      {/* 移动端：底部抽屉 */}
      {isDrawerOpen !== undefined && (
        <div
          className={`md:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-300
            ${isDrawerOpen ? "translate-y-0" : "translate-y-full"}`}
          style={{ height: "45vh" }}
        >
          <div className="h-full bg-soft-white rounded-t-2xl shadow-lg border-t border-warm-gray/20 overflow-hidden">
            {content}
          </div>
        </div>
      )}
    </>
  )
}
