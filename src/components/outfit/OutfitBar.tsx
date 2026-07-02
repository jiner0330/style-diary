"use client"

import { useOutfitStore } from "@/store/outfit"
import { getItemById } from "@/lib/mock-data"

const MAIN_SLOTS = [
  { slot: "top", label: "上衣" },
  { slot: "bottom", label: "下装" },
  { slot: "dress", label: "连衣裙" },
  { slot: "outerwear", label: "外套" },
  { slot: "shoes", label: "鞋子" },
] as const

interface Props {
  compact?: boolean
  onAddClick?: (category: string) => void
  gender?: "female" | "male"
}

/** 迷你人台预览 — 单品缩略图叠加在微型人台剪影上 */
function MiniPreview({ imageUrl, color }: { imageUrl?: string | null; color?: string }) {
  return (
    <div className="relative w-8 h-[14px] flex-shrink-0 flex items-center justify-center">
      {/* 人台剪影 · CSS 沙漏型 */}
      <div
        className="absolute inset-0 rounded-[4px] opacity-15"
        style={{
          background: color || "#B0A8A0",
          clipPath: "polygon(40% 0%, 60% 0%, 64% 14%, 62% 28%, 58% 34%, 50% 40%, 42% 34%, 38% 28%, 36% 14%, 40% 0%, 34% 40%, 28% 55%, 22% 72%, 20% 88%, 24% 100%, 76% 100%, 80% 88%, 78% 72%, 72% 55%, 66% 40%)",
        }}
      />
      {/* 单品小图（仅当有真实图片时） */}
      {imageUrl && !imageUrl.startsWith("data:") && (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain opacity-70"
          draggable={false}
        />
      )}
    </div>
  )
}

export default function OutfitBar({ compact = false, onAddClick, gender }: Props) {
  const outfit = useOutfitStore((s) => s.outfit)
  const removeSlot = useOutfitStore((s) => s.removeSlot)

  const slots = gender === "male"
    ? MAIN_SLOTS.filter((s) => s.slot !== "dress")
    : MAIN_SLOTS

  const filledSlots = slots.filter(({ slot }) => {
    const id = outfit[slot]
    return id && typeof id === "string"
  }).map(({ slot, label }) => {
    const id = outfit[slot] as string
    const item = getItemById(id)
    return { slot, label, id, item }
  })

  const accessories = outfit.accessories
    .map((id) => ({ id, item: getItemById(id) }))
    .filter((a) => a.item)

  const hasAnyItem = filledSlots.length > 0 || accessories.length > 0

  if (!hasAnyItem && !compact) return null

  // ===== 紧凑模式（移动端） =====
  if (compact) {
    return (
      <div className="w-full px-4">
        <p className="text-[11px] text-charcoal/70 mb-2 tracking-wide">搭配清单</p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          {/* 已填槽位卡片 — 点击可重新选择替换 */}
          {filledSlots.map(({ slot, label, item }) => (
            <div
              key={slot}
              onClick={() => onAddClick?.(slot)}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl
                         bg-rose/8 border border-rose/15 cursor-pointer
                         active:bg-rose/15 transition-colors"
            >
              <MiniPreview imageUrl={item?.image_url} color={item?.color} />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] text-charcoal/60 leading-tight">{label}</span>
                <span className="text-[11px] text-charcoal font-medium leading-tight truncate max-w-[72px]">
                  {item?.name || "—"}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeSlot(slot as any) }}
                className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full
                           bg-warm-gray/20 text-[10px] text-warm-gray hover:bg-rose/20 hover:text-rose
                           transition-colors flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}

          {/* 配饰卡片 — 点击可重新选择替换 */}
          {accessories.map(({ id, item }) => (
            <div
              key={id}
              onClick={() => onAddClick?.("accessory")}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl
                         bg-rose/8 border border-rose/15 cursor-pointer
                         active:bg-rose/15 transition-colors"
            >
              <MiniPreview imageUrl={item?.image_url} color={item?.color} />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] text-charcoal/60 leading-tight">配饰</span>
                <span className="text-[11px] text-charcoal font-medium leading-tight truncate max-w-[72px]">
                  {item?.name || "—"}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeSlot("accessories", id) }}
                className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full
                           bg-warm-gray/20 text-[10px] text-warm-gray hover:bg-rose/20 hover:text-rose
                           transition-colors flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}

          {/* 空槽位占位 */}
          {slots.filter(({ slot }) => !outfit[slot] || typeof outfit[slot] !== "string")
            .map(({ slot, label }) => (
              <button
                key={`empty-${slot}`}
                onClick={() => onAddClick?.(slot)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl
                           border border-dashed border-warm-gray/30 hover:border-rose/30
                           hover:bg-rose/5 transition-colors"
              >
                {/* 空态剪影 */}
                <div className="w-8 h-[14px] flex-shrink-0 rounded-[4px] bg-warm-gray/10" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] text-charcoal/50 leading-tight">{label}</span>
                  <span className="text-[11px] text-charcoal/50 leading-tight whitespace-nowrap">
                    点击添加
                  </span>
                </div>
              </button>
            ))}
          {/* 配饰空槽位 — 始终可见，方便添加多个不同类别配饰 */}
          <button
            onClick={() => onAddClick?.("accessory")}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl
                       border border-dashed border-warm-gray/30 hover:border-rose/30
                       hover:bg-rose/5 transition-colors"
          >
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-warm-gray/10 text-[10px] text-warm-gray">
              +
            </div>
            <span className="text-[11px] text-charcoal/50 leading-tight whitespace-nowrap">
              {accessories.length > 0 ? '再加配饰' : '添加配饰'}
            </span>
          </button>
        </div>
      </div>
    )
  }

  // ===== 桌面模式：卡片缩略图 =====
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] text-charcoal/70 mr-1 flex-shrink-0">已搭配</span>
      {filledSlots.map(({ slot, label, item }) => (
        <div
          key={slot}
          onClick={() => onAddClick?.(slot)}
          className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl
                     bg-rose/8 border border-rose/15 group
                     ${onAddClick ? 'cursor-pointer' : ''}`}
        >
          <MiniPreview imageUrl={item?.image_url} color={item?.color} />
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-[9px] text-charcoal/60">{label}</span>
            <span className="text-[11px] text-charcoal font-medium truncate max-w-[80px]">
              {item?.name || "—"}
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); removeSlot(slot as any) }}
            className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full
                       bg-warm-gray/20 text-[10px] text-warm-gray hover:bg-rose/20 hover:text-rose
                       transition-colors flex-shrink-0"
          >
            ×
          </button>
        </div>
      ))}
      {accessories.map(({ id, item }) => (
        <div
          key={id}
          onClick={() => onAddClick?.("accessory")}
          className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl
                     bg-rose/8 border border-rose/15 group
                     ${onAddClick ? 'cursor-pointer' : ''}`}
        >
          <MiniPreview imageUrl={item?.image_url} color={item?.color} />
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-[9px] text-charcoal/60">配饰</span>
            <span className="text-[11px] text-charcoal font-medium truncate max-w-[80px]">
              {item?.name || "—"}
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); removeSlot("accessories", id) }}
            className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full
                       bg-warm-gray/20 text-[10px] text-warm-gray hover:bg-rose/20 hover:text-rose
                       transition-colors flex-shrink-0"
          >
            ×
          </button>
        </div>
      ))}
      {!hasAnyItem && (
        <span className="text-[11px] text-charcoal/50">拖拽单品到人台</span>
      )}
    </div>
  )
}
