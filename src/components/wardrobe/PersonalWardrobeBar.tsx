"use client"

import { useRef, useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import type { ClothingItem } from "@/types"
import { usePersonalWardrobe } from "@/hooks/usePersonalWardrobe"
import { getAuthToken } from "@/lib/supabase"
import toast from "react-hot-toast"

interface Props {
  onItemClick?: (item: ClothingItem) => void
  compact?: boolean
}

/** 桌面端：可拖拽的个人衣橱单品 */
function DraggableChip({ item, onClick }: { item: ClothingItem; onClick?: (item: ClothingItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: isDragging ? 100 : 1 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl cursor-grab active:cursor-grabbing touch-none
        bg-cream/60 hover:bg-rose/5 hover:ring-1 hover:ring-rose/20
        transition-[background-color,box-shadow] active:scale-95 group ${isDragging ? "opacity-60 shadow-lg ring-2 ring-rose/30" : ""}`}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] overflow-hidden bg-cream cursor-pointer"
        onClick={() => onClick?.(item)}
      >
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover pointer-events-none" draggable={false} />
        ) : (
          <span className="text-warm-gray/50">{item.name.slice(0, 2)}</span>
        )}
      </div>
      <span
        className="text-[11px] text-charcoal max-w-[80px] truncate cursor-pointer"
        onClick={() => onClick?.(item)}
      >{item.name}</span>
    </div>
  )
}

/** 移动端：可点击的个人衣橱单品 */
function ClickableThumb({ item, onClick }: { item: ClothingItem; onClick?: (item: ClothingItem) => void }) {
  return (
    <button
      onClick={() => onClick?.(item)}
      className="flex-shrink-0 w-14 h-14 rounded-xl bg-cream/50 overflow-hidden
                 hover:ring-2 hover:ring-rose/30 transition-[background-color,box-shadow] active:scale-95"
    >
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[9px] text-warm-gray/50">
          {item.name.slice(0, 3)}
        </div>
      )}
    </button>
  )
}

export default function PersonalWardrobeBar({ onItemClick, compact = false }: Props) {
  const { items, loading, refresh } = usePersonalWardrobe()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const isEmpty = items.length === 0

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const token = await getAuthToken()
      if (!token) {
        toast.error("请先登录再上传")
        return
      }

      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/wardrobe", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "上传失败")
        return
      }

      toast.success("上传成功！")
      refresh()
    } catch (err: any) {
      toast.error(err.message || "上传失败，请重试")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function triggerUpload(capture?: boolean) {
    const input = fileInputRef.current
    if (!input) return
    if (capture) input.setAttribute("capture", "environment")
    else input.removeAttribute("capture")
    input.click()
  }

  const UploadBtns = (
    <div className="flex gap-2">
      <button
        onClick={() => triggerUpload(true)}
        disabled={uploading}
        className="text-[11px] px-3 py-1.5 rounded-full bg-rose/5 text-rose/70
                   hover:bg-rose/10 hover:text-rose transition-colors disabled:opacity-50"
      >
        {uploading ? "上传中..." : "📷 拍照"}
      </button>
      <button
        onClick={() => triggerUpload(false)}
        disabled={uploading}
        className="text-[11px] px-3 py-1.5 rounded-full bg-rose/5 text-rose/70
                   hover:bg-rose/10 hover:text-rose transition-colors disabled:opacity-50"
      >
        🖼 图库
      </button>
    </div>
  )

  // ---- 移动端 ----
  if (compact) {
    return (
      <>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-warm-gray/60 tracking-wide">我的衣橱</p>
            {!isEmpty && UploadBtns}
          </div>
          {loading ? (
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-14 h-14 rounded-xl bg-cream/50 animate-pulse flex-shrink-0" />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-xs text-warm-gray/40">还没有添加衣服</p>
              {UploadBtns}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {items.map((item) => (
                <ClickableThumb key={item.id} item={item} onClick={onItemClick} />
              ))}
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </>
    )
  }

  // ---- 桌面端 ----
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-warm-gray/60 flex-shrink-0">我的衣橱</span>

        {loading ? (
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-20 h-7 rounded-full bg-cream/50 animate-pulse flex-shrink-0" />
            ))}
          </div>
        ) : isEmpty ? (
          <>
            {UploadBtns}
            <span className="text-[10px] text-warm-gray/30">拍照上传你的衣服，问搭搭怎么搭配</span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {items.map((item) => (
                <DraggableChip key={item.id} item={item} onClick={onItemClick} />
              ))}
            </div>
            {UploadBtns}
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  )
}
