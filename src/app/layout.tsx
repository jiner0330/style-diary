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
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AudioProvider>
          <main className="flex-1 flex flex-col max-w-md mx-auto w-full">
            {children}
          </main>
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
