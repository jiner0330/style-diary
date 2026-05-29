"use client"

import { useState, useRef } from "react"

const ANGLES = ["000", "045", "180"]
const ANGLE_LABELS = ["正面", "3/4侧", "背面"]

export interface ReviewData {
  totalScore: number
  dimensions: { label: string; score: number; icon: string }[]
  comment: string
}

const STAR_FILL = "text-amber-400"
const STAR_EMPTY = "text-warm-gray/20"

function StarRating({ score }: { score: number }) {
  const stars = Math.round(score / 20)
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= stars ? STAR_FILL : STAR_EMPTY}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.284-3.957z" />
        </svg>
      ))}
    </span>
  )
}

interface Props {
  resultImages: Map<number, { url: string; prompt: string; promptZh?: string; mode?: string }>
  resultAngle: number
  generatingAngle: number | null
  genStage: "connecting" | "generating" | "processing"
  elapsed: number
  onAngleChange: (index: number) => void
  onClose: () => void
  onSave?: () => void
  onGenerateAngle?: (index: number) => void
  reviewData?: ReviewData | null
  reviewLoading?: boolean
}

export default function ResultModal({
  resultImages,
  resultAngle,
  generatingAngle,
  genStage,
  elapsed,
  onAngleChange,
  onClose,
  onSave,
  onGenerateAngle,
  reviewData,
  reviewLoading,
}: Props) {
  const [dragging, setDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartAngle = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const currentImage = resultImages.get(resultAngle)
  const isGenerating = generatingAngle !== null && generatingAngle === resultAngle && !currentImage
  const generatedCount = resultImages.size

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault()
    setDragging(true)
    dragStartX.current = e.clientX
    dragStartAngle.current = resultAngle
    containerRef.current?.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const dx = e.clientX - dragStartX.current
    const steps = Math.round(dx / 40)
    const newIndex = ((dragStartAngle.current - steps) % 3 + 3) % 3
    onAngleChange(newIndex)
  }

  function handlePointerUp(_e: React.PointerEvent) {
    setDragging(false)
    try { containerRef.current?.releasePointerCapture(_e.pointerId) } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative bg-soft-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center
                     rounded-full bg-charcoal/10 text-charcoal hover:bg-charcoal/20 transition-colors"
        >
          ×
        </button>

        <div className="p-6">
          <h3 className="text-lg font-medium text-charcoal text-center mb-2">
            穿搭效果图
          </h3>
          <p className="text-[11px] text-warm-gray/50 text-center mb-4">
            {ANGLE_LABELS[resultAngle]}视角 · 水平拖拽旋转 · 已生成 {generatedCount}/3 角度
          </p>

          {/* 图片区 */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={`relative w-full max-w-[240px] sm:max-w-full mx-auto rounded-2xl overflow-hidden
              ${dragging ? "cursor-grabbing" : "cursor-ew-resize"}`}
            style={{ aspectRatio: "4/7", touchAction: "none" }}
          >
            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full border-[3px] border-warm-gray/15 border-t-rose animate-spin" />
                <p className="text-xs text-warm-gray/60">
                  {genStage === "connecting" && "连接 AI 服务..."}
                  {genStage === "generating" && "AI 绘制中..."}
                  {genStage === "processing" && "处理图片中..."}
                </p>
                <p className="text-[10px] text-warm-gray/40">
                  {ANGLE_LABELS[resultAngle]}视角 · {elapsed}s
                </p>
              </div>
            ) : currentImage ? (
              <img
                src={currentImage.url}
                alt={`穿搭效果 ${ANGLE_LABELS[resultAngle]}视角`}
                className="w-full h-full object-contain select-none pointer-events-none"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <p className="text-xs text-warm-gray/40">此角度未生成</p>
                {onGenerateAngle && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onGenerateAngle(resultAngle)
                    }}
                    className="px-4 py-2 rounded-full bg-rose text-white text-xs font-medium
                               active:scale-95 transition-transform shadow-sm"
                  >
                    生成此角度
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 8 角度指示器 */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {ANGLES.map((_, i) => {
              const hasImage = resultImages.has(i)
              const isCurrent = resultAngle === i
              const isPending = generatingAngle === i
              return (
                <button
                  key={i}
                  onClick={() => onAngleChange(i)}
                  className={`rounded-full transition-[width,height,background-color] duration-200
                    ${isCurrent
                      ? "w-2.5 h-2.5"
                      : "w-1.5 h-1.5"
                    }
                    ${hasImage
                      ? "bg-charcoal/60"
                      : isPending
                        ? "bg-rose animate-pulse"
                        : "bg-charcoal/20"
                    }`}
                  title={`${ANGLE_LABELS[i]}${hasImage ? " (已生成)" : ""}`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-[9px] text-warm-gray/30 mt-1 px-4">
            {ANGLE_LABELS.map((label, i) => (
              <span key={i} className={i === resultAngle ? "text-charcoal/60" : ""}>{label}</span>
            ))}
          </div>

          {/* 移动端滚动提示 */}
          {currentImage && (reviewData || reviewLoading || currentImage.prompt) && (
            <p className="sm:hidden text-[9px] text-warm-gray/30 text-center mt-2 animate-pulse">
              ↓ 向下滚动查看点评与详情
            </p>
          )}

          {/* 搭搭点评卡片 */}
          {currentImage && (reviewData || reviewLoading) && (
            <div className="mt-5 bg-cream/50 rounded-2xl p-4 animate-fade-in-up">
              {/* 头部 */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🦊</span>
                <span className="text-sm font-medium text-charcoal">搭搭点评</span>
                {reviewLoading ? (
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-warm-gray/50">
                    <span className="w-3 h-3 rounded-full border-2 border-warm-gray/20 border-t-rose animate-spin" />
                    评价中...
                  </span>
                ) : reviewData ? (
                  <>
                    <span className="text-[10px] text-warm-gray/40 ml-auto">综合评分</span>
                    <span className="text-lg font-semibold text-charcoal">{reviewData.totalScore}</span>
                    <StarRating score={reviewData.totalScore} />
                  </>
                ) : null}
              </div>

              {reviewLoading ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-soft-white rounded-xl px-3 py-2 animate-pulse">
                        <div className="h-3 bg-warm-gray/10 rounded w-16 mb-1" />
                        <div className="h-1.5 bg-warm-gray/10 rounded-full" />
                      </div>
                    ))}
                  </div>
                  <div className="bg-soft-white rounded-xl px-3 py-2.5 animate-pulse">
                    <div className="h-3 bg-warm-gray/10 rounded w-full" />
                  </div>
                </div>
              ) : reviewData ? (
                <>
                  {/* 四维分数 */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {reviewData.dimensions.map((d) => (
                      <div key={d.label} className="bg-soft-white rounded-xl px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-warm-gray/60">
                            {d.icon} {d.label}
                          </span>
                          <span className="text-xs font-medium text-charcoal">
                            <span className="text-rose">{d.score}</span>
                            <span className="text-warm-gray/30">/25</span>
                          </span>
                        </div>
                        <div className="h-1 bg-warm-gray/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-rose/60 to-rose transition-all duration-700"
                            style={{ width: `${(d.score / 25) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 幽默点评 */}
                  <div className="relative bg-soft-white rounded-xl px-3 py-2.5">
                    <p className="text-xs text-charcoal leading-relaxed">
                      <span className="text-rose mr-1">💬</span>
                      {reviewData.comment}
                    </p>
                    <div className="absolute -bottom-1 left-4 w-3 h-3 bg-soft-white rotate-45" />
                  </div>
                </>
              ) : null}

              {/* 操作按钮 */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-warm-gray/30 text-charcoal text-sm
                             hover:bg-soft-white transition-colors active:scale-[0.98]"
                >
                  🔄 再搭一套
                </button>
                <button
                  onClick={() => {
                    if (onSave) {
                      onSave()
                    } else {
                      const name = prompt("给这个方案起个名字：")
                      if (name) {
                        import("@/store/outfit").then((m) => {
                          m.useOutfitStore.getState().saveOutfit(name)
                        })
                      }
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-charcoal text-soft-white text-sm font-medium
                             hover:bg-charcoal/90 transition-colors active:scale-[0.98]"
                >
                  💾 保存
                </button>
              </div>
            </div>
          )}

          {/* Prompt 折叠 — 默认展示中文 */}
          {currentImage?.prompt && (
            <details className="mt-4">
              <summary className="text-xs text-warm-gray cursor-pointer hover:text-rose transition-colors">
                查看生成 Prompt
                {currentImage.mode && (
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                    currentImage.mode === "edits" ? "bg-green-50 text-green-500" : "bg-amber-50 text-amber-500"
                  }`}>
                    {currentImage.mode === "edits" ? "图生图" : "文生图"}
                  </span>
                )}
              </summary>
              <div className="mt-2 space-y-2">
                {currentImage.promptZh && (
                  <p className="text-xs text-warm-gray/80 bg-cream/50 rounded-xl p-3 leading-relaxed">
                    {currentImage.promptZh}
                  </p>
                )}
                <details className="ml-2">
                  <summary className="text-[10px] text-warm-gray/40 cursor-pointer">查看英文原文</summary>
                  <p className="mt-1 text-[10px] text-warm-gray/50 bg-cream/30 rounded-xl p-3 leading-relaxed">
                    {currentImage.prompt}
                  </p>
                </details>
              </div>
            </details>
          )}

          {/* 下载按钮 */}
          {currentImage && (
            <a
              href={currentImage.url}
              download
              className="block mt-3 py-2 rounded-xl border border-warm-gray/20 text-warm-gray text-xs text-center
                         hover:text-rose hover:border-rose/20 transition-colors"
            >
              下载当前视角原图
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
