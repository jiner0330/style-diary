"use client"

import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"

interface Props {
  id: string
  label: string
  className?: string
  isOccupied: boolean
  children?: React.ReactNode
}

export default function DropZone({ id, label, className, isOccupied, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute border-2 border-dashed rounded-lg transition-all duration-200 flex items-center justify-center",
        "text-[10px] text-center",
        isOver
          ? "border-rose bg-rose/15 scale-105 shadow-lg"
          : isOccupied
            ? "border-rose/40 bg-rose/5"
            : "border-warm-gray/30 bg-soft-white/40 hover:border-warm-gray/60",
        className
      )}
    >
      {children || (
        <span className={isOccupied ? "text-rose" : "text-warm-gray/60"}>{label}</span>
      )}
    </div>
  )
}
