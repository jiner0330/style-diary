import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Toaster } from "react-hot-toast"

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
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <main className="flex-1 flex flex-col max-w-md mx-auto w-full">
          {children}
        </main>
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
