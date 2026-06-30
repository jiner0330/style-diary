"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import toast from "react-hot-toast"

interface Props {
  imageUrl: string
  onClose: () => void
}

export default function SharePanel({ imageUrl, onClose }: Props) {
  const [shareImageUrl, setShareImageUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const composeImage = useCallback(async () => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = imageUrl
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
    })

    const canvas = document.createElement("canvas")
    const padding = 16
    const footerH = 72
    const maxW = 360

    const ratio = img.width / img.height
    const drawW = Math.min(img.width, maxW)
    const drawH = drawW / ratio

    canvas.width = drawW + padding * 2
    canvas.height = drawH + padding * 2 + footerH

    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = "#FAF7F4"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 圆角裁剪
    const rx = 16, ry = 16
    ctx.beginPath()
    ctx.moveTo(padding + rx, padding)
    ctx.lineTo(padding + drawW - rx, padding)
    ctx.quadraticCurveTo(padding + drawW, padding, padding + drawW, padding + rx)
    ctx.lineTo(padding + drawW, padding + drawH - ry)
    ctx.quadraticCurveTo(padding + drawW, padding + drawH, padding + drawW - rx, padding + drawH)
    ctx.lineTo(padding + rx, padding + drawH)
    ctx.quadraticCurveTo(padding, padding + drawH, padding, padding + drawH - ry)
    ctx.lineTo(padding, padding + rx)
    ctx.quadraticCurveTo(padding, padding, padding + rx, padding)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(img, padding, padding, drawW, drawH)

    // 脚标
    const ctx2 = canvas.getContext("2d")!
    ctx2.font = "600 16px system-ui, -apple-system, sans-serif"
    ctx2.fillStyle = "#4A4A4A"
    ctx2.textAlign = "center"
    ctx2.fillText("🦊 风格日记 · dada-ai.cn", canvas.width / 2, drawH + padding * 2 + 36)

    ctx2.font = "11px system-ui, -apple-system, sans-serif"
    ctx2.fillStyle = "#999"
    ctx2.fillText("上传你的衣服，AI 帮你搭配", canvas.width / 2, drawH + padding * 2 + 54)

    const dataUrl = canvas.toDataURL("image/png")
    canvasRef.current = canvas
    setShareImageUrl(dataUrl)
    setLoading(false)
  }, [imageUrl])

  useEffect(() => {
    composeImage().catch(() => {
      setLoading(false)
    })
  }, [composeImage])

  async function handleShare() {
    if (!canvasRef.current) return

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current!.toBlob((b) => resolve(b), "image/png")
      )
      if (!blob) return

      const file = new File([blob], "搭配效果图.png", { type: "image/png" })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "风格日记 AI 穿搭",
          text: "和搭搭一起，找到属于你的搭配 dada-ai.cn",
        })
      } else if (navigator.share) {
        await navigator.share({
          title: "风格日记 AI 穿搭",
          text: "和搭搭一起，找到属于你的搭配 dada-ai.cn",
          url: "https://dada-ai.cn",
        })
      } else {
        fallbackCopy()
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        fallbackCopy()
      }
    }
  }

  function fallbackCopy() {
    navigator.clipboard?.writeText("https://dada-ai.cn").then(() => {
      toast.success("链接已复制，去分享吧 ✨")
    }).catch(() => {
      toast("长按上方图片保存，手动分享给朋友吧", { icon: "📸" })
    })
  }

  function handleCopyLink() {
    navigator.clipboard?.writeText("https://dada-ai.cn").then(() => {
      toast.success("链接已复制")
    }).catch(() => {
      toast("https://dada-ai.cn", { duration: 5000 })
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-soft-white rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-medium text-charcoal">分享这套搭配</h4>
          <button onClick={onClose} className="text-warm-gray/50 hover:text-charcoal text-lg leading-none">×</button>
        </div>

        {/* 分享图片预览 */}
        <div className="bg-cream/30 rounded-2xl p-2 mb-4">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-warm-gray/40 text-sm animate-pulse">
              生成分享图中...
            </div>
          ) : shareImageUrl ? (
            <img
              src={shareImageUrl}
              alt="分享图"
              className="w-full rounded-xl"
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-warm-gray/40 text-sm">
              生成失败
            </div>
          )}
        </div>

        <p className="text-[10px] text-warm-gray/40 text-center mb-4">
          长按上方图片即可保存到相册
        </p>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-rose text-white text-sm font-medium
                       active:scale-[0.98] transition-all disabled:opacity-50"
          >
            📤 分享给朋友
          </button>
          <button
            onClick={handleCopyLink}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-warm-gray/30 text-charcoal text-sm
                       active:scale-[0.98] transition-all disabled:opacity-50"
          >
            📋 复制链接
          </button>
        </div>
      </div>
    </div>
  )
}
