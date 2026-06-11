import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL,
  ...(process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://localhost:4000"]
    : []),
].filter(Boolean) as string[]

const ALLOWED_METHODS = "GET, POST, DELETE, OPTIONS"
const ALLOWED_HEADERS = "Content-Type, Authorization"
const MAX_AGE = "86400"

export default function proxy(request: NextRequest) {
  const origin = request.headers.get("origin")
  if (!origin) return NextResponse.next()

  const isAllowed = ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.some((o) => origin.startsWith(o))

  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 })
    if (isAllowed) {
      response.headers.set("Access-Control-Allow-Origin", origin)
      response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS)
      response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS)
      response.headers.set("Access-Control-Max-Age", MAX_AGE)
    }
    return response
  }

  const response = NextResponse.next()
  if (isAllowed) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Access-Control-Allow-Credentials", "true")
  }
  return response
}

export const config = {
  matcher: "/api/:path*",
}
