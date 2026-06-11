/**
 * 轻量级埋点工具
 *
 * 设计原则：
 * - 客户端缓冲 + 批量发送，不阻塞用户操作
 * - 页面卸载前 flush，减少丢失
 * - 静默失败，埋点永远不抛异常
 * - 隐私：只发送匿名行为数据，不收集个人信息
 */

type EventName =
  | "scene_enter"
  | "scene_leave"
  | "outfit_item_add"
  | "outfit_item_remove"
  | "outfit_clear"
  | "generation_start"
  | "generation_complete"
  | "generation_error"
  | "outfit_save"
  | "outfit_load"
  | "result_view"
  | "evaluation_complete"

interface EventPayload {
  event: EventName
  sceneId?: string | null
  properties?: Record<string, unknown>
}

const queue: EventPayload[] = []
const MAX_BATCH = 20
const FLUSH_INTERVAL = 3000 // 3s 批量发送

let timer: ReturnType<typeof setTimeout> | null = null
let flushing = false

async function flush() {
  if (flushing || queue.length === 0) return
  flushing = true

  const batch = queue.splice(0, MAX_BATCH)
  try {
    const token = await getToken()
    await fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ events: batch }),
      // 页面卸载时用 keepalive 确保请求发出
      keepalive: true,
    })
  } catch {
    // 静默失败
  } finally {
    flushing = false
    // 如果还有剩余，继续发送
    if (queue.length > 0) scheduleFlush()
  }
}

function scheduleFlush() {
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    flush()
  }, FLUSH_INTERVAL)
}

async function getToken(): Promise<string | null> {
  try {
    const { supabase } = await import("@/lib/supabase")
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

/**
 * 记录一个埋点事件。客户端缓冲后批量发送，不阻塞。
 */
export function track(
  event: EventName,
  options?: { sceneId?: string | null; properties?: Record<string, unknown> }
) {
  if (typeof window === "undefined") return

  queue.push({
    event,
    sceneId: options?.sceneId ?? null,
    properties: options?.properties ?? {},
  })

  // 超过批量阈值立即发送
  if (queue.length >= MAX_BATCH) {
    if (timer) { clearTimeout(timer); timer = null }
    flush()
    return
  }

  scheduleFlush()
}

// 页面卸载前 flush
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (timer) { clearTimeout(timer); timer = null }
    flush()
  })

  // 页面隐藏时也 flush（移动端切后台）
  window.addEventListener("pagehide", () => {
    if (timer) { clearTimeout(timer); timer = null }
    flush()
  })
}
