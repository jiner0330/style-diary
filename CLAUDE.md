# CLAUDE.md

> **核心原则**：简单方案优先（组件内 `useState` + `localStorage` 直接读写），避免引入 Zustand 中间件、跨组件状态提升等复杂方案；每次改动后必须确认部署到用户实际测试的端口。**拖拽/滑动交互问题先分析数据流时序**：`setState` 是异步的，`pointerdown` 后紧跟的 `pointermove` 读到的是旧值，不要用 `useState` 做事件守卫，用 `useRef`。

## 移动端调试：按钮无响应的快速排查

当移动端（iOS Safari）出现"页面能打开但所有按钮点击无反应"时，**不要从代码逻辑开始排查**。问题几乎总是在网络/端口/Javascript加载层面。

### 快速定位四步

**1. 端口检查（最常见原因）**

iOS Safari 会静默阻止非标准端口上的 JavaScript bundle 加载（HTML 能加载但 JS 不执行）。Next.js 默认端口 3000 在 iOS 受限范围内。4000、8080 已验证可用。

```bash
npx next dev -H 0.0.0.0 -p 4000
```

**2. 纯 HTML 隔离测试**

访问 `/mobile-test.html`（public 目录下的静态文件，不经过 Next.js/React）。
- 如果这个也不工作 → 网络/端口问题。
- **如果这个工作但 `/dressing` 不工作 → 代码问题（最近改动引入了运行时错误）**。

这是区分"端口/网络问题"和"代码问题"的关键步骤。本次（2026-05-30）就是通过此步骤定位到：状态提升（state lifting）引发的跨组件导入复杂度导致页面 hydration 失败，而非端口问题。

**3. allowedDevOrigins 检查**

Next.js dev server 会阻止跨域 HMR WebSocket 连接。手机通过局域网 IP 访问时，需要在 `next.config.ts` 配置：

```ts
allowedDevOrigins: ["<手机所在IP>"],
```

注意：`"*"` 通配符在 Next.js 16 中**不生效**，必须显式列出 IP。服务端日志出现 `Blocked cross-origin request to Next.js dev resource` 即为该问题。

**4. 简单页面组件对比测试**

访问最小化的 React 页面（如 `/test`）对比。如果 `/test` 工作但目标页面不工作 → 目标页面组件有问题。

### 排查决策树

```
按钮无响应
  ├─ /mobile-test.html 按钮能点？
  │   ├─ 不能 → 端口/网络问题（换端口、检查防火墙）
  │   └─ 能 → 代码问题 ↓
  ├─ 服务端日志有 "Blocked cross-origin" 警告？
  │   └─ 有 → 加 allowedDevOrigins，重启
  ├─ /test 页面按钮能点？
  │   ├─ 不能 → 全局性问题（检查 _app/layout）
  │   └─ 能 → /dressing 特有，检查最近改动
  └─ 生产构建 (next build && next start) 是否正常？
      ├─ 正常 → dev server HMR 问题
      └─ 不正常 → 代码运行时错误
```

### 不要做的事情

- **不要先改 dnd-kit 传感器配置** — 没有一例是由 PointerSensor/TouchSensor/MouseSensor 配置问题导致的。
- **不要先改 CSS**（backdrop-blur、touch-action 等） — 如果问题波及所有按钮，就不可能是 CSS 问题。
- **不要盲目进行跨组件状态提升** — 在页面级组件和子组件之间传递状态时，新增的 import 和 props 变更可能在构建时通过、但运行时导致 hydration 失败。优先考虑在组件内部自管理状态 + localStorage 持久化，避免跨组件的 props 传递复杂度。

## 视觉识别 API 调试：模型没看到图片的三层排查

当 `classifyClothing` 返回错误分类（裙子识别成上衣）或无意义结果时，**第一个该问的是"图片有没有进模型的眼睛"**——视觉 API 返回 200 + `finish: stop` 不代表模型看到了图。

### 三层问题模型

| 层 | 问题 | 症状 | 修复 |
|----|------|------|------|
| 1. 图片传递 | URL 对 API 不可达（Supabase Storage → ofox.ai） | 模型猜出品类，但颜色/材质全错 | 传 ArrayBuffer → base64 直传，不走 URL |
| 2. 代理层兼容 | ofox.ai 的 OpenAI→Gemini 格式转换未正确映射 base64，base64 被当 text token 计 | `finish: "length"`，输出截断在 50-60 字符 | 换 GPT-4o（同代理，格式转换正确） |
| 3. 图片体积 | 原始图 1.6MB base64 即使正确传输也过大 | 间歇性截断或响应慢 | sharp 压缩到 1024px / JPEG 80%，降至 ~70KB |

三层缺一不可。单独修任一层都不够——换模型但不压缩、或压缩后仍用 Gemini，都会继续失败。

### 排查决策树

```
视觉识别结果异常
  ├─ [vision] 日志里有 "match=false" 或返回长度 < 100？
  │   ├─ finish=length → 图片太大或模型不兼容 base64（第2/3层）
  │   └─ finish=stop 长度 < 100 → 模型没看到图（第1层）
  ├─ 品类都分错？（裙子→上衣）
  │   └─ 极高概率是第1层：图片根本没到模型。检查图片传递方式。
  ├─ 品类对但颜色/材质错？
  │   └─ 模型能模糊看到但信息不足。检查图片压缩是否过度。
  └─ GPT-4o 正常、Gemini 不正常？
      └─ ofox.ai 代理的格式转换问题，不是 Gemini 本身的问题。直接用 GPT-4o。
```

### 必要日志（已在 ai.ts 实现）

每条视觉 API 调用必须打印：
- `[vision] image resized: XKB → YKB (base64: ZKB)` — 输入输出尺寸
- `[vision] model=..., finish=..., len=..., full=...` — 模型名、finish_reason、返回长度
- `[vision] match=true/false, jsonLen=...` — JSON 提取结果

没有这些日志，盲猜耗时至少扩大 10 倍。

### ofox.ai 代理的已知坑

- **Gemini 2.5 Flash via ofox.ai**：`image_url` 格式的 base64 被计入 text token，小图（25KB）也可能触发 `finish: length` 截断。不要在这个代理上对 Gemini 用 base64。
- **GPT-4o via ofox.ai**：base64 正常走视觉编码器，128KB 以下稳定。当前视觉识别首选。
- **GPT Image via ofox.ai**：生图走这个代理正常，和视觉识别是独立路径，互不影响。

### 模型选型分工

- **我来选**：根据场景需求（颜色准确度、结构化输出、base64 兼容性）和已知的代理坑，给出推荐模型和理由。
- **用户来批**：费用、账号配额、成本容忍度只有你知道。选模型时给出理由和备选，确认后执行。
- 不要自行切换 API 或模型端点，先说明分析结论。

## 重要规则

- **不要自行切换 API**：遇到 API 端点报错（如 404、400）时，先分析清楚兼容性和影响范围，确认变更是否会影响其他已有功能模块。向用户说明分析结论，得到确认回复后再执行修改。禁止未经确认直接替换 API 端点或模型。
