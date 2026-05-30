"use client"

interface Props {
  status: "idle" | "generating" | "done" | "error" | null
  error?: string
  onViewResult: () => void
  onRetry: () => void
}

export default function GenerationBar({ status, error, onViewResult, onRetry }: Props) {
  if (!status || status === "idle") return null

  const isGenerating = status === "generating"
  const isError = status === "error"

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center">
      <div
        onClick={() => {
          if (isGenerating) return
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
          ${isGenerating ? "cursor-default" : "hover:shadow-xl hover:border-rose/20"}
          ${status === "done" ? "border-rose/30 shadow-rose/5" : ""}
          ${isError ? "border-red-200" : ""}
        `}
      >
        {isGenerating && (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-warm-gray/15 border-t-rose animate-spin" />
            <span className="text-xs text-warm-gray/70 font-medium whitespace-nowrap">生成中...</span>
          </>
        )}
        {status === "done" && (
          <>
            <span className="w-2 h-2 rounded-full bg-rose animate-pulse" />
            <span className="text-xs text-rose font-medium whitespace-nowrap">已生成</span>
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
