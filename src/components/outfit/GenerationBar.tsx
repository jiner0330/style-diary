"use client"

interface Props {
  status: "idle" | "generating" | "done" | "error" | null
  error?: string
  onViewResult: () => void
  onRetry: () => void
  onViewProgress: () => void
}

export default function GenerationBar({ status, error, onViewResult, onRetry, onViewProgress }: Props) {
  // 仅生成中和失败时显示，完成后由「完成搭配」按钮统一入口
  if (!status || status === "idle" || status === "done") return null

  const isGenerating = status === "generating"
  const isError = status === "error"

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center">
      <div
        onClick={() => {
          if (isGenerating) { onViewProgress(); return }
          if (isError) { onRetry(); return }
          onViewResult()
        }}
        className={`
          flex items-center gap-2 px-3 py-2.5
          bg-soft-white/95 backdrop-blur-sm
          border border-warm-gray/20
          rounded-l-2xl shadow-lg
          transition-all duration-300 cursor-pointer
          active:scale-[0.98]
          hover:shadow-xl
          ${isGenerating ? "hover:border-rose/30" : ""}
          ${isError ? "border-red-200" : ""}
        `}
      >
        {isGenerating && (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-warm-gray/15 border-t-rose animate-spin" />
            <span className="text-xs text-warm-gray/70 font-medium whitespace-nowrap">生成中 · 查看</span>
          </>
        )}
        {isError && (
          <>
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs text-red-500 font-medium whitespace-nowrap" title={error}>
              生成失败 · 重试
            </span>
          </>
        )}
      </div>
    </div>
  )
}
