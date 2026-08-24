import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { ZCOOL_KuaiLe } from "next/font/google"
import "./globals.css"
import { Toaster } from "react-hot-toast"
import { AudioProvider } from "@/components/scene/AudioProvider"

const zcoolKuaiLe = ZCOOL_KuaiLe({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dada-ai.cn"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "搭搭 - 把你衣柜里的衣服搭出好方案",
  description: "约会、通勤、日常，基于你真实衣橱的智能搭配。不推荐你买新衣服，帮你把已有的衣服搭好。",
  openGraph: {
    title: "搭搭 - 把你衣柜里的衣服搭出好方案",
    description: "约会、通勤、日常，基于你真实衣橱的智能搭配。不推荐你买新衣服，帮你把已有的衣服搭好。",
    url: SITE_URL,
    type: "website",
    locale: "zh_CN",
    siteName: "搭搭",
    images: [{ url: "/showcase-1.jpg", width: 900, height: 1200, alt: "搭搭 AI 搭配效果示例" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className={`h-full antialiased ${zcoolKuaiLe.className}`}>
      <Script id="baidu-analytics" strategy="afterInteractive">
        {`var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?9a43bc62a56d7b30b90a966e31bc598e";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();`}
      </Script>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AudioProvider>
          <main className="flex-1 flex flex-col max-w-md mx-auto w-full">
            {children}
          </main>
          <footer className="text-center py-3 px-4">
            <a
              href="https://beian.miit.gov.cn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-warm-gray/40 hover:text-warm-gray/60 transition-colors"
            >
              苏ICP备2026042784号
            </a>
            <span className="text-[10px] text-warm-gray/30 mx-1">|</span>
            <a
              href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=32059002008176"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-warm-gray/40 hover:text-warm-gray/60 transition-colors"
            >
              苏公网安备32059002008176号
            </a>
          </footer>
        </AudioProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#FAF7F4",
              color: "#5C5C5C",
              border: "1px solid #E8DED1",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  )
}
