"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import confetti from "canvas-confetti"
import SharePanel from "./SharePanel"

const ANGLES = ["000", "180"]
const ANGLE_LABELS = ["正面", "背面"]
const SWIPE_THRESHOLD = 30
const MAX_VISUAL_SHIFT = 120

// UI index → API angleIndex
function toApiAngle(uiIndex: number): number {
  return uiIndex === 0 ? 0 : 2
}

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
  gender: "female" | "male"
  shouldCelebrate: boolean
  onCelebrated: () => void
  onAngleChange: (uiIndex: number) => void
  onClose: () => void
  onSave?: () => void
  onGenerateAngle?: (uiIndex: number) => void
  reviewData?: ReviewData | null
  reviewLoading?: boolean
  shareCloseTrigger?: number
}

export default function ResultModal({
  resultImages,
  resultAngle,
  generatingAngle,
  genStage,
  elapsed,
  gender,
  shouldCelebrate,
  onCelebrated,
  onAngleChange,
  onClose,
  onSave,
  onGenerateAngle,
  reviewData,
  reviewLoading,
  shareCloseTrigger,
}: Props) {
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)
  const [visualShift, setVisualShift] = useState(0)
  const dragStartX = useRef(0)
  const dragStartAngle = useRef(0)
  const currentDx = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef(0)
  const lastGenFingerprint = useRef("")
  const [feedback, setFeedback] = useState<"liked" | "disliked" | null>(null)
  const [showShare, setShowShare] = useState(false)

  useEffect(() => { setShowShare(false) }, [shareCloseTrigger])

  // Map API angleIndex → image; resultImages is keyed by API angleIndex (0 or 2)
  const apiAngle = toApiAngle(resultAngle)
  const currentImage = resultImages.get(apiAngle)
  const isGenerating = generatingAngle !== null && generatingAngle === apiAngle && !currentImage
  const generatedCount = resultImages.size
  const mannequinPrefix = gender === "female" ? "mannequin-female" : "mannequin-male"

  // 预加载人台底图
  const cacheVer = useRef(Date.now())
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set())
  useEffect(() => {
    ANGLES.forEach((angle) => {
      const img = new Image()
      img.src = `/${mannequinPrefix}-${angle}.png?v=${cacheVer.current}`
      img.onload = () => setImagesLoaded((prev) => new Set(prev).add(angle))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender])

  const mannequinSrc = `/${mannequinPrefix}-${ANGLES[resultAngle]}.png?v=${cacheVer.current}`

  // 评分庆祝动画 — 由父组件跟踪去重，同一轮生成只展示一次
  const [celebration, setCelebration] = useState<"idle" | "showing" | "done">("idle")

  const triggerCelebration = useCallback((score: number) => {
    setCelebration("showing")

    if (score >= 85) {
      const end = Date.now() + 1500
      const colors = ["#f472b6", "#fbbf24", "#a78bfa", "#34d399", "#60a5fa"]
      ;(function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors,
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors,
        })
        if (Date.now() < end) requestAnimationFrame(frame)
      })()
    }

    setTimeout(() => setCelebration("done"), 2500)
  }, [])

  useEffect(() => {
    if (
      shouldCelebrate &&
      reviewData &&
      !reviewLoading &&
      celebration === "idle" &&
      currentImage
    ) {
      onCelebrated()
      triggerCelebration(reviewData.totalScore)
    }
  }, [shouldCelebrate, reviewData, reviewLoading, celebration, triggerCelebration, currentImage, onCelebrated])

  function startDrag(clientX: number) {
    draggingRef.current = true
    setDragging(true)
    dragStartX.current = clientX
    dragStartAngle.current = resultAngle
    currentDx.current = 0
    setVisualShift(0)
  }

  function moveDrag(clientX: number) {
    if (!draggingRef.current) return
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const dx = clientX - dragStartX.current
      currentDx.current = dx
      const clamped = Math.max(-MAX_VISUAL_SHIFT, Math.min(MAX_VISUAL_SHIFT, dx))
      setVisualShift(clamped)
    })
  }

  function endDrag() {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    cancelAnimationFrame(rafRef.current)

    const dx = currentDx.current
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const direction = dx > 0 ? -1 : 1
      const newIndex = ((dragStartAngle.current + direction) % 2 + 2) % 2
      onAngleChange(newIndex)
    }
    currentDx.current = 0
    setVisualShift(0)
  }

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // 新一代生成 → 重置反馈
  useEffect(() => {
    const entries = Array.from(resultImages.entries())
    const fp = entries.map(([k, v]) => `${k}:${v.url}`).sort().join("|")
    if (fp && fp !== lastGenFingerprint.current) {
      if (lastGenFingerprint.current) setFeedback(null)
      lastGenFingerprint.current = fp
    }
  }, [resultImages])

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault()
    startDrag(e.clientX)
    containerRef.current?.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    moveDrag(e.clientX)
  }

  function handlePointerUp(e: React.PointerEvent) {
    endDrag()
    try { containerRef.current?.releasePointerCapture(e.pointerId) } catch {}
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
          <p className="text-[11px] text-warm-gray/50 text-center mb-2">
            {ANGLE_LABELS[resultAngle]}视角 · 图片上左右滑动旋转 · 已生成 {generatedCount}/{ANGLES.length} 角度
          </p>

          {/* 模型说明 */}
          {isGenerating && (
            <p className="mb-4 text-xs text-warm-gray/70 text-center animate-text-breathe">
              基于 GPT Image 2 模型生成，等待稍久，画质更细腻
            </p>
          )}

          {/* 图片区 */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`relative w-full max-w-[280px] sm:max-w-sm mx-auto rounded-2xl overflow-hidden select-none
              ${dragging ? "cursor-grabbing shadow-lg" : "cursor-ew-resize"}`}
            style={{ aspectRatio: "4/7", touchAction: "none" }}
          >
            {/* 预加载所有人台角度图 */}
            {ANGLES.map((angle) => (
              <img
                key={`preload-${angle}`}
                src={`/${mannequinPrefix}-${angle}.png?v=${cacheVer.current}`}
                alt=""
                className="hidden"
                draggable={false}
              />
            ))}

            {/* 人台底图 + AI 效果图（一起跟手平移） */}
            <div
              className="absolute inset-0 flex items-center justify-center rounded-2xl"
              style={{
                transform: `translateX(${visualShift}px)`,
                transition: dragging ? "none" : "transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1.2)",
              }}
            >
              {/* 人台底图 — AI 图片覆盖时透明度降为 0 */}
              <img
                src={mannequinSrc}
                alt=""
                className="w-full h-full object-contain select-none pointer-events-none transition-opacity duration-150"
                draggable={false}
                style={{
                  opacity: currentImage ? 0 : (!imagesLoaded.has(ANGLES[resultAngle]) ? 0.6 : 1),
                }}
              />

              {/* AI 生成效果图覆盖在人台上 */}
              {currentImage && (
                <img
                  src={currentImage.url}
                  alt={`穿搭效果 ${ANGLE_LABELS[resultAngle]}视角`}
                  className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
                  draggable={false}
                />
              )}
            </div>

            {/* 生成中遮罩 */}
            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-soft-white/60 rounded-2xl px-4">
                <div className="w-10 h-10 rounded-full border-[3px] border-warm-gray/15 border-t-rose animate-spin" />

                {/* 进度条 */}
                <div className="w-full max-w-[200px]">
                  <div className="h-2 rounded-full bg-warm-gray/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose/50 via-rose to-rose/80 transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(elapsed / 60 * 95, 95)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-warm-gray/50">{ANGLE_LABELS[resultAngle]}视角</span>
                    <span className="text-[10px] text-warm-gray/50 font-medium">
                      {elapsed < 5
                        ? "预计约 1 分钟"
                        : `预计剩余 ${Math.max(Math.round(60 - elapsed), 5)}s`}
                    </span>
                  </div>
                </div>

                {/* 安抚文案（轮换） */}
                <p className="text-sm text-charcoal/70 font-medium text-center leading-relaxed max-w-[200px] transition-opacity duration-500">
                  {elapsed < 15
                    ? "精心搭配值得等待 ✦"
                    : elapsed < 40
                    ? "每一笔都是为你定制..."
                    : "马上就好，正在做最后的润色 ✨"}
                </p>
              </div>
            )}

            {/* 未生成遮罩 — 生成按钮 */}
            {!currentImage && !isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl">
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

            {/* 拖拽方向提示 */}
            {dragging && Math.abs(visualShift) > 5 && (
              <div
                className="absolute inset-y-0 w-1/2 flex items-center pointer-events-none"
                style={{ left: visualShift > 0 ? 0 : "auto", right: visualShift < 0 ? 0 : "auto" }}
              >
                <div className={`w-full h-full ${visualShift > 0 ? "bg-gradient-to-r" : "bg-gradient-to-l"} from-rose/5 to-transparent`} />
              </div>
            )}
          </div>

          {/* 反馈按钮 */}
          {currentImage && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={() => setFeedback(feedback === "liked" ? null : "liked")}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90
                  ${feedback === "liked"
                    ? "bg-rose/10 text-rose shadow-sm"
                    : "bg-warm-gray/5 text-warm-gray/35 hover:text-rose/60 hover:bg-rose/5"}`}
                title="喜欢这套搭配"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={feedback === "liked" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
              </button>
              <button
                onClick={() => setFeedback(feedback === "disliked" ? null : "disliked")}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90
                  ${feedback === "disliked"
                    ? "bg-charcoal/10 text-charcoal shadow-sm"
                    : "bg-warm-gray/5 text-warm-gray/35 hover:text-charcoal/60 hover:bg-charcoal/5"}`}
                title="不太满意"
              >
                <svg className="w-5 h-5 rotate-180" viewBox="0 0 24 24" fill={feedback === "disliked" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
              </button>
            </div>
          )}

          {/* 角度指示器 */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {ANGLES.map((_, i) => {
              const hasImage = resultImages.has(toApiAngle(i))
              const isCurrent = resultAngle === i
              const isPending = generatingAngle === toApiAngle(i)
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
          <div className="flex justify-between text-[9px] text-warm-gray/30 mt-1 px-8">
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
            <div className="mt-5 bg-cream/50 rounded-2xl p-4 animate-fade-in-up relative overflow-hidden">
              {/* 🎉 85+ 庆祝动画 */}
              {reviewData && celebration === "showing" && reviewData.totalScore >= 85 && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-cream/90 rounded-2xl animate-celebration-in">
                  <span className="text-6xl animate-celebration-bounce">🎉</span>
                  <p className="mt-3 text-base font-semibold text-charcoal animate-celebration-text">
                    看来你是一个时髦精！
                  </p>
                </div>
              )}

              {/* 🦊 低于 85 分调侃动画 */}
              {reviewData && celebration === "showing" && reviewData.totalScore < 85 && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-cream/90 rounded-2xl animate-celebration-in">
                  <span className="text-5xl animate-fox-tilt">🦊</span>
                  <p className="mt-2 text-sm font-medium text-charcoal/80">
                    搭搭觉得你还差一口气
                  </p>
                  <p className="mt-1 text-xs text-warm-gray/50">
                    {reviewData.totalScore >= 70
                      ? "但已经很不错了，微调一下更出彩～"
                      : "再试试调整版型和色彩搭配吧！"}
                  </p>
                </div>
              )}

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
                    <span className={`text-lg font-semibold ${reviewData.totalScore >= 85 ? "bg-gradient-to-r from-amber-400 to-rose bg-clip-text text-transparent" : "text-charcoal"}`}>
                      {reviewData.totalScore}
                    </span>
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
              <div className="flex flex-col gap-2 mt-4">
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
                  className="w-full py-3 rounded-xl bg-charcoal text-soft-white text-sm font-medium
                             active:scale-[0.98] transition-all shadow-md"
                >
                  💾 保存搭配
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowShare(true)}
                    className="flex-1 py-2.5 rounded-xl border border-rose/30 text-rose text-sm
                               active:scale-[0.98] transition-all"
                  >
                    📤 分享
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-warm-gray/30 text-charcoal text-sm
                               hover:bg-soft-white transition-colors active:scale-[0.98]"
                  >
                    🔄 再搭一套
                  </button>
                </div>
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
        {currentImage && showShare && (
          <SharePanel imageUrl={currentImage.url} onClose={() => setShowShare(false)} />
        )}
      </div>
    </div>
  )
}
