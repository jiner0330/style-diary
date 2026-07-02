"use client"

import { useState, useEffect, useMemo } from "react"
import { useOutfitStore } from "@/store/outfit"
import { getItemsByCategory } from "@/lib/mock-data"
import { CATEGORY_LABELS, ACCESSORY_SUBCAT_LABEL, ACCESSORY_SUBCAT_ORDER } from "@/lib/utils"
import ClothingCard from "./ClothingCard"
import type { ClothingCategory, ClothingItem } from "@/types"

const CATEGORIES: ClothingCategory[] = ["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory"]

interface Props {
  isDrawerOpen?: boolean
  onClose?: () => void
  pendingCategory?: string | null
  onItemClick?: (item: ClothingItem) => void
  onUndo?: () => void
  onClearAll?: () => void
  hasHistory?: boolean
  gender?: "female" | "male"
}

export default function WardrobePanel({ isDrawerOpen, onClose, pendingCategory, onItemClick, onUndo, onClearAll, hasHistory, gender }: Props) {
  const isMale = gender === "male"
  const visibleCategories = useMemo(
    () => isMale ? CATEGORIES.filter((c) => c !== "dress") : CATEGORIES,
    [isMale]
  )
  const [activeTab, setActiveTab] = useState<ClothingCategory>(visibleCategories[0])
  const outfit = useOutfitStore((s) => s.outfit)
  const itemsByCategory = getItemsByCategory(gender)

  useEffect(() => {
    if (pendingCategory && visibleCategories.includes(pendingCategory as ClothingCategory)) {
      setActiveTab(pendingCategory as ClothingCategory)
    }
  }, [pendingCategory, visibleCategories])

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

  // 配饰按 sub_category 分组
  const groupedAccessories = useMemo(() => {
    if (activeTab !== 'accessory') return null
    const groups: Record<string, ClothingItem[]> = {}
    for (const item of systemItems) {
      const subCat = item.sub_category || 'other'
      if (!groups[subCat]) groups[subCat] = []
      groups[subCat].push(item)
    }
    // 按 ACCESSORY_SUBCAT_ORDER 排序
    const ordered: [string, ClothingItem[]][] = []
    for (const key of ACCESSORY_SUBCAT_ORDER) {
      if (groups[key]) ordered.push([key, groups[key]])
    }
    for (const [key, items] of Object.entries(groups)) {
      if (!ACCESSORY_SUBCAT_ORDER.includes(key)) ordered.push([key, items])
    }
    return ordered
  }, [activeTab, systemItems])

  const content = (
    <div className="h-full flex flex-col">
      {/* 标题 + 操作按钮 */}
      <div className="px-2 py-2 flex items-center justify-between">
        <h3 className="text-xs font-medium text-charcoal">系统衣橱</h3>
        <div className="flex items-center gap-0.5">
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!hasHistory}
              className="text-[10px] px-1.5 py-0.5 rounded-full text-warm-gray hover:text-rose hover:bg-rose/5
                         transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ↩ 撤销
            </button>
          )}
          {onClearAll && (
            <button
              onClick={onClearAll}
              className="text-[10px] px-1.5 py-0.5 rounded-full text-warm-gray hover:text-rose hover:bg-rose/5
                         transition-colors"
            >
              清空
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-warm-gray hover:text-rose text-xs ml-0.5">
              收起
            </button>
          )}
        </div>
      </div>

      {/* 品类 Tab */}
      <div className="flex flex-wrap gap-1 px-2 pb-2">
        {visibleCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap transition-[background-color,color,box-shadow]
              ${activeTab === cat
                ? "bg-rose text-soft-white shadow-sm"
                : "bg-cream/50 text-warm-gray hover:bg-rose/10 hover:text-rose"
              }`}
          >
            {CATEGORY_LABELS[cat]}
            <span className="ml-0.5 opacity-60">{itemsByCategory[cat]?.length || 0}</span>
          </button>
        ))}
      </div>

      {/* 单品展示区 */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isMale && systemItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
            <span className="text-3xl">👔</span>
            <p className="text-sm text-charcoal/70 font-medium">男生单品即将上线</p>
            <p className="text-xs text-warm-gray/50 leading-relaxed max-w-[200px]">
              拍照上传你的衣服到「我的衣橱」，搭搭帮你搭配
            </p>
          </div>
        ) : groupedAccessories ? (
          // 配饰：按 sub_category 分组
          <div className="flex flex-col gap-3">
            {groupedAccessories.map(([subCat, items]) => (
              <div key={subCat}>
                <p className="text-[10px] text-charcoal/50 px-1 mb-1">
                  {ACCESSORY_SUBCAT_LABEL[subCat] || subCat}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {items.map((item) => (
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
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-3 gap-1.5">
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
        )}
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
          className="md:hidden fixed inset-x-0 bottom-0 z-[80]"
          style={{ height: "58vh" }}
        >
          <div className="h-full bg-soft-white rounded-t-2xl shadow-lg border-t border-warm-gray/20 overflow-hidden">
            {content}
          </div>
        </div>
      )}
    </>
  )
}
