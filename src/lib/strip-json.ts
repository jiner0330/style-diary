// 从 AI 文本中剥离搭配方案 JSON，只保留散文供展示。
// 方案 JSON 由前端/后端各自解析成卡片，这里负责把它从可见文字里清除。
// 覆盖三种历史泄露场景：成对围栏、未闭合围栏（被截断的第二套方案）、字符串内含花括号 + 截断的裸 JSON。

// 从 start 处的 "{" 向后扫描配对的 "}"，跳过字符串内的花括号；未闭合（截断）时返回结尾索引。
function scanObjectEnd(s: string, start: number): number {
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === "\\") esc = true
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === "{") depth++
    else if (c === "}") {
      depth--
      if (depth === 0) return i
    }
  }
  return s.length - 1 // 未闭合 → 视为延伸到结尾，整段剥除
}

export function stripJSONFromText(text: string): string {
  // 1. 去掉成对的 ```...``` 代码块
  let cleaned = text.replace(/```[\s\S]*?```/g, "")
  // 2. 残留的未闭合 ```（如被截断、只有开围栏的第二套方案）→ 从它起剥到结尾
  const loneFence = cleaned.indexOf("```")
  if (loneFence !== -1) cleaned = cleaned.slice(0, loneFence)

  // 3. 无围栏的裸 JSON 对象：字符串感知括号匹配，截断的也剥到结尾
  const ranges: [number, number][] = []
  const markers = [/"plan"\s*:\s*\d+/g, /"items"\s*:\s*\[/g]
  for (const rawRe of markers) {
    let match: RegExpExecArray | null
    while ((match = rawRe.exec(cleaned)) !== null) {
      let start = match.index
      while (start > 0 && cleaned[start] !== "{") start--
      if (cleaned[start] !== "{") continue
      ranges.push([start, scanObjectEnd(cleaned, start)])
    }
  }

  // 合并重叠区间（同一对象可能被两个 marker 同时命中），再逆序删除避免索引错位
  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const [s, e] of ranges) {
    const last = merged[merged.length - 1]
    if (last && s <= last[1]) last[1] = Math.max(last[1], e)
    else merged.push([s, e])
  }
  for (let r = merged.length - 1; r >= 0; r--) {
    cleaned = cleaned.slice(0, merged[r][0]) + cleaned.slice(merged[r][1] + 1)
  }

  return cleaned.replace(/\n{3,}/g, "\n\n").trim()
}
