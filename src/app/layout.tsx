import type { Metadata, Viewport } from "next"
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

export const metadata: Metadata = {
  title: "风格日记 - 你的AI造型师",
  description: "和搭搭一起，为生活的每个重要时刻找到属于你的搭配",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className={`h-full antialiased ${zcoolKuaiLe.className}`}>
      <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?9a43bc62a56d7b30b90a966e31bc598e";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();`,
            }}
          />
      </head>
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
