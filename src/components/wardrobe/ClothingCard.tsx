"use client"

import { useDraggable } from "@dnd-kit/core"
import type { ClothingItem } from "@/types"

interface Props {
  item: ClothingItem
  isEquipped: boolean
  /** 点击添加模式：点击即添加，无须拖拽 */
  clickToAdd?: boolean
  onQuickAdd?: (item: ClothingItem) => void
}

export default function ClothingCard({ item, isEquipped, clickToAdd, onQuickAdd }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.id, data: { item } })

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: isDragging ? 100 : 1,
      }
    : undefined

  function handleClick() {
    if (clickToAdd && onQuickAdd && !isEquipped) {
      onQuickAdd(item)
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      suppressHydrationWarning
      className={`relative rounded-xl border-2 transition-[border-color,box-shadow,opacity] cursor-grab active:cursor-grabbing touch-none
        ${isDragging
          ? "border-rose opacity-60 shadow-lg scale-105"
          : isEquipped
            ? "border-rose opacity-70"
            : clickToAdd
              ? "border-rose/50 hover:border-rose hover:shadow-md active:scale-[0.97]"
              : "border-warm-gray/30 hover:border-rose/40 opacity-100"
        }`}
    >
      {/* 单品图片 + 点击热区（与拖拽分离，避免事件冲突） */}
      <div
        className="w-full aspect-[3/4] rounded-t-xl overflow-hidden bg-cream/30"
        onClick={handleClick}
      >
        <img
          src={item.image_url || ""}
          alt={item.name}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      </div>

      {/* 单品名 */}
      <div className="p-1.5 text-center">
        <p className="text-[10px] text-charcoal truncate">{item.name}</p>
      </div>

      {/* 已穿着标记 */}
      {isEquipped && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-rose rounded-full
                        flex items-center justify-center text-[10px] text-white">
          ✓
        </div>
      )}
    </div>
  )
}
