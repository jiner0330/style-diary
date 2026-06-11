"use client"

import { useEffect } from "react"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[error-boundary]", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="text-6xl mb-4 opacity-40">:/</div>
      <h2 className="text-xl font-semibold text-charcoal mb-2">
        页面加载出错
      </h2>
      <p className="text-sm text-warm-gray mb-6 max-w-sm">
        抱歉，当前页面遇到了一些问题。请尝试刷新页面，或稍后再来。
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 rounded-full bg-charcoal text-white text-sm hover:bg-charcoal/90 transition-colors"
      >
        重新加载
      </button>
    </div>
  )
}
