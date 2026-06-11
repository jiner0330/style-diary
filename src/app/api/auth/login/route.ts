import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    let email: string, password: string

    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      const body = await request.json()
      email = body.email
      password = body.password
    } else {
      // Form submission fallback (non-JS browsers)
      const formData = await request.formData()
      email = formData.get("email") as string
      password = formData.get("password") as string
    }

    if (!email || !password) {
      return NextResponse.json({ error: "请填写邮箱和密码" }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      // For form submissions, redirect back with error
      if (!contentType.includes("application/json")) {
        const url = new URL("/auth", request.url)
        url.searchParams.set("error", encodeURIComponent(error.message))
        return NextResponse.redirect(url)
      }
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    if (!data.session) {
      if (!contentType.includes("application/json")) {
        const url = new URL("/auth", request.url)
        url.searchParams.set("error", encodeURIComponent("登录失败，请重试"))
        return NextResponse.redirect(url)
      }
      return NextResponse.json({ error: "登录失败，请重试" }, { status: 500 })
    }

    // For form submissions, set session cookie and redirect
    if (!contentType.includes("application/json")) {
      const response = NextResponse.redirect(new URL("/scenes", request.url))
      // Store tokens in cookies so server can read them
      response.cookies.set("sb-access-token", data.session.access_token, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: data.session.expires_in,
      })
      response.cookies.set("sb-refresh-token", data.session.refresh_token, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
      })
      return response
    }

    // JSON response for JS clients
    return NextResponse.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      user: { id: data.user.id, email: data.user.email },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "服务器错误"
    console.error("[login]", message)
    return NextResponse.json({ error: "登录失败，请稍后重试" }, { status: 500 })
  }
}
