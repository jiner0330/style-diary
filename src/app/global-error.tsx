"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[global-error-boundary]", error)
  }, [error])

  return (
    <html>
      <body className="bg-cream min-h-screen flex items-center justify-center font-sans">
        <div className="flex flex-col items-center justify-center px-6 text-center">
          <div className="text-6xl mb-4 opacity-40">:/</div>
          <h1 className="text-xl font-semibold text-charcoal mb-2">
            系统遇到了问题
          </h1>
          <p className="text-sm text-warm-gray mb-6 max-w-sm">
            抱歉，应用遇到了意外错误。请刷新页面重试。
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-full bg-charcoal text-white text-sm hover:bg-charcoal/90 transition-colors"
          >
            重新加载
          </button>
        </div>
      </body>
    </html>
  )
}
