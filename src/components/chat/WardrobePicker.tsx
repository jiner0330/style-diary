"use client"

import type { ClothingItem } from "@/types"

const CATEGORY_LABELS: Record<string, string> = {
  dress: "连衣裙", top: "上衣", bottom: "下装",
  outerwear: "外套", shoes: "鞋", bag: "包", accessory: "配饰",
}

const CATEGORY_ORDER = ["dress", "top", "bottom", "outerwear", "shoes", "bag", "accessory"]

interface Props {
  items: ClothingItem[]
  selected: Set<string>
  onToggle: (id: string) => void
  onClose: () => void
  onConfirm: () => void
}

export default function WardrobePicker({ items, selected, onToggle, onClose, onConfirm }: Props) {
  // Group by category, sorted by CATEGORY_ORDER
  const grouped = new Map<string, ClothingItem[]>()
  for (const cat of CATEGORY_ORDER) {
    const catItems = items.filter((i) => i.category === cat)
    if (catItems.length > 0) grouped.set(cat, catItems)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-soft-white rounded-t-3xl max-h-[60vh] w-full shadow-2xl flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-warm-gray/10">
          <h3 className="text-sm font-medium text-charcoal">
            选择单品 {selected.size > 0 && `(${selected.size})`}
          </h3>
          <button onClick={onClose} className="text-warm-gray/50 hover:text-charcoal text-lg">×</button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {Array.from(grouped.entries()).map(([cat, catItems]) => (
            <div key={cat}>
              <p className="text-[10px] text-warm-gray/40 mb-2 px-1">{CATEGORY_LABELS[cat] || cat}</p>
              <div className="grid grid-cols-3 gap-2">
                {catItems.map((item) => {
                  const isSelected = selected.has(item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => onToggle(item.id)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all active:scale-95
                        ${isSelected
                          ? "border-rose shadow-sm"
                          : "border-warm-gray/10 hover:border-warm-gray/30"}`}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-[3/4] bg-cream/50 flex items-center justify-center">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl opacity-20">
                            {item.category === "shoes" ? "👟" : item.category === "bag" ? "👜" : "👕"}
                          </span>
                        )}
                      </div>
                      {/* Name label */}
                      <div className="px-1.5 py-1 bg-white/90">
                        <p className="text-[10px] text-charcoal truncate leading-tight">{item.name}</p>
                      </div>
                      {/* Checkmark */}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Confirm */}
        <div className="px-4 py-3 border-t border-warm-gray/10">
          <button
            onClick={onConfirm}
            className="w-full py-3 rounded-xl bg-charcoal text-soft-white text-sm font-medium
                       active:scale-[0.98] transition-all"
          >
            确定{selected.size > 0 ? ` (${selected.size} 件)` : ""}
          </button>
        </div>
      </div>
    </div>
  )
}
