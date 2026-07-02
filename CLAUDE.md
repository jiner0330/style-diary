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

## Vercel 部署排障：本地与生产环境的四层差异

### 核心教训

**本地通过 ≠ Vercel 能跑。** 2026-06-11 首次生产部署踩了四层叠加的环境差异，每修一层才暴露下一层，反馈周期极长（改代码 → 推 GitHub → 等 Vercel 日志）。

### 四层差异速查

| 层 | 差异 | 症状 | 检查方法 |
|----|------|------|----------|
| 文件系统 | git symlink (mode 120000) 指向外部路径，Vercel clone 后不存在 | `Module not found` | `git ls-files -s` 查看文件模式，120000 = symlink |
| 平台架构 | macOS arm64 vs Linux x64，native 二进制（SWC）不兼容 | lockfile 里包在但 npm 不安装 | `grep swc-linux package-lock.json` |
| 构建行为 | Vercel 的 `modifyConfig` 强推 Turbopack，无视 `--webpack` 标志 | 日志显示 `Applying modifyConfig` + `(Turbopack)` | 看 Vercel 构建日志前 10 行 |
| 体积限制 | Serverless Function 250MB 硬限制，本地不关心文件大小 | `exceeded the unzipped maximum size` | `du -sh public/` + `git ls-files public/ \| xargs du -k \| sort -rn` |

### 高频陷阱

1. **Symlink 到外部工作区** — `src/lib/rules → ~/.openclaw/workspace/rules` 在 git 里是 mode 120000，Vercel 无此路径。**解决**：把真实文件拷进项目并提交。
2. **Untracked 但被 import 的文件** — `git status` 不会主动告诉你某个 import 的文件不在仓库里。**解决**：构建报 `Module not found` 时，先用 `git ls-files` 确认文件是否被追踪。
3. **Vercel 无视 `--webpack`** — Next.js 16 项目 Vercel 会注入 `modifyConfig` 强开 Turbopack，package.json 的 `--webpack` 标志和 `vercel.json` 的 `buildCommand` 都可能被覆盖。**解决**：别对抗 Turbopack，确保 SWC Linux 二进制可安装即可——把 `@next/swc-linux-x64-gnu` 和 `@next/swc-linux-x64-musl` 加入 `optionalDependencies`。
4. **静态资源膨胀** — PNG 4096px / 19MB、MP3 13 分钟 / 24MB，累计 301MB 直接打穿 250MB 函数限制。**解决**：sharp 压缩 PNG 到 max 1200px，音频转 AAC 96kbps。`git ls-files public/ | xargs du -k | sort -rn | head -20` 快速定位大文件。

### 最佳实践：部署前本地模拟

```bash
# 模拟 Vercel 构建（比推代码快 10 倍）
npx vercel build --prod

# 检查哪些文件会被部署
git ls-files | xargs du -k | sort -rn | head -20

# 确认没有 symlink
git ls-files -s | grep "^120000"
```

### 排查顺序

```
部署失败
  ├─ 构建阶段失败？
  │   ├─ Module not found → git ls-files 检查文件是否追踪
  │   ├─ symlink 问题 → git ls-files -s | grep "^120000"
  │   └─ SWC 缺失 → optionalDependencies + 检查 lockfile
  ├─ 部署阶段失败？
  │   └─ 250MB 超限 → du -sh public/ + 压缩大文件
  └─ 运行时错误？
      └─ Vercel 环境变量是否配齐（对照 .env.example）
```

### 运行时文件系统：serverless 不能写文件、不能跑后台任务

**2026-06-24**：生图功能本地正常，Vercel 上每次点「生成效果图」都 500「生成失败」。日志 `ENOENT: mkdir '/var/task/public/outputs'`。根因与业务逻辑无关，是 serverless 运行时模型——补在上面四层之外的第五类差异。

三个不可违反的约束：

1. **函数文件系统只读，唯一可写是 `/tmp`**。`process.cwd()` 指向 `/var/task`（只读），且**函数包根本不含 `public/` 目录**（public 只作为静态资源走 CDN，不打进 Lambda）。任何往项目目录 `mkdir`/`writeFile` 都报 `ENOENT`/`EROFS`。
2. **`/tmp` 可写，但每个实例独立、调用间不保证保留**。「实例 A 写文件 → 实例 B 读回」的跨调用共享不可靠。
3. **响应返回后，后台任务被冻结**。`runTask().catch(...)` 这种 fire-and-forget 不会跑完。于是「POST 提交任务 + GET 轮询读文件状态」的异步架构在 serverless 上整体失效：文件写不进、即便写进也不跨实例、后台任务还被杀。

**正确做法**：同步完成 + 通过响应体（或外部存储）回传结果。本项目生图改法：POST 内同步 `await` 调 ofox.ai，结果以 `data:image/png;base64,...` 直接返回，不落盘、不轮询。

**同步的代价 = 函数超时预算**：同步意味着整个生成必须在函数超时内跑完。**Hobby 60s / Pro 300s**。单次调用超时要设在预算内（生图设 55s），且没空间做重试+退避。若任务本身可能超预算 → 只能上真正的异步（外部队列/worker + 外部存储），不能靠 fire-and-forget。

**判别**：凡是「本地能跑、Vercel 报 ENOENT/EROFS 或任务永远 generating/超时」的功能，先查是不是在**写本地文件**或**依赖响应后的后台任务**。

## 网络架构：境内外链路分离

### 核心原则

Vercel hkg1（香港）节点无法稳定访问中国大陆服务，必须将国内/境外调用分离到不同服务器：
- **国内服务**（阿里云 SMS、Supabase 上海）→ 阿里云 FC 上海 或 客户端直连
- **境外服务**（ofox.ai、DeepSeek）→ Vercel HK

### 当前架构

```
浏览器（国内）
  ├─ ESA 边缘加速（dada-ai.cn / www）→ origin → Vercel HK → DeepSeek / ofox.ai（境外）
  ├─ 阿里云 FC 上海 → 阿里云 SMS + Supabase 上海（同城）
  └─ supabase-js 客户端直连 → Supabase 上海
```

### 短信认证踩坑记录（2026-06-24）

**问题**：手机号登录提示"创建用户失败"，后续改为短信发送失败、验证码校验失败。

**根因**：Vercel hkg1 → 阿里云 `dypnsapi.aliyuncs.com` 间歇性 ConnectTimeout，Vercel hkg1 → Supabase `vklltmfmttuaahqmwksu.supabase.co` 持续 ENOTFOUND DNS 解析失败。同一个 Vercel 节点无法同时服务国内和境外链路。

**解决方案**：将 `send-sms` 和 `verify-sms` 两个函数从 Vercel 拆出，独立部署到阿里云函数计算（Web 函数、Node.js 22、上海区域）。前端通过 `NEXT_PUBLIC_FC_SEND_SMS_URL` 和 `NEXT_PUBLIC_FC_VERIFY_SMS_URL` 直调 FC 公网 URL。

**SDK 兼容问题**：`@alicloud/dypnsapi20170525` 在 CommonJS `require` 下的正确用法：
```javascript
const Client = require("@alicloud/dypnsapi20170525").default
const { SendSmsVerifyCodeRequest, CheckSmsVerifyCodeRequest } = require("@alicloud/dypnsapi20170525")
```
三个连续错误：`MODULE_NOT_FOUND`（缺依赖）→ `Client is not a constructor`（缺 .default）→ `Client.SendSmsVerifyCodeRequest is not a constructor`（命名导出需解构）。

**阿里云 FC 部署要点**：
- 函数类型选「Web 函数」，HTTP 触发器选「无需认证」
- 超时设 30s，内存 512MB
- 环境变量 `PHONE_USER_SECRET` 需在 Vercel 和阿里云 FC 两端保持一致
- 函数代码需显式 `http.createServer` + `server.listen(FC_SERVER_PORT || 9000)` 常驻进程
- 在线编辑器部署不自动 `npm install`，需上传含 node_modules 的 zip 包

### 已验证的调用

| 调用 | 路径 | 状态 |
|------|------|:--:|
| `/api/chat` → `supabase.auth.getUser()` | Vercel HK → Supabase 上海 | ✅ 已验证 (2026-06-29) |
| `/api/weather` → 和风天气 | Vercel HK → 和风天气 | ✅ 已验证 (2026-06-29) |

### ESA 生产架构（2026-06-29 上线）

ESA（阿里云边缘安全加速）已部署在 Vercel 前方，承接 `dada-ai.cn` / `www.dada-ai.cn`：

```
用户（国内）→ ESA（全球边缘）→ origin.dada-ai.cn（CNAME→Vercel HK）
```

关键配置（均在阿里云 ESA 控制台管理，非代码层面）：
- 缓存：`/_next/static/*` 和静态资源后缀缓存 7d，`/api/*` 绕开缓存
- 回源超时：≥60s（生图同步调用需要 55s 预算）
- 重定向：`www→apex` 301（ESA 规则引擎，保留 query string）
- 证书：Let's Encrypt 免费证书，DNS 验证，ESA 自动续签
- `/api/chat` SSE 流式：bypass cache 后正常透传，无需特殊处理
- **HTTP/2 回源必须关闭**：ESA 启 HTTP/2 回源 → Vercel 时，ESA 维护多条 HTTP/2 长连接，其中某条 TLS 会话间歇性损坏，导致浏览器交替出现"页面无法打开"（无 HTTP 响应）。关闭后走 HTTP/1.1 回源，每次新建连接，问题消失。排查耗时最长（2026-06-30），不要重开。

**排障提示**：用户反馈页面问题时，先确认是 ESA 缓存还是 Vercel 源站问题——用 `origin.dada-ai.cn` 直连源站对比测试。浏览器 Network 里 Status 为空（无 HTTP 响应）= 连接层面问题，先查 ESA HTTP/2 回源是否被误开启。

### fc-functions 目录

- `fc-functions/send-sms/` — 短信发送（阿里云 FC）
- `fc-functions/verify-sms/` — 验证码校验 + Supabase 用户创建（阿里云 FC）
- 部署方式：本地 `npm install --production` 后打包 zip，上传到阿里云 FC

## `https.Agent` timeout 不控制连接超时

`new https.Agent({ timeout: 30_000 })` 的 `timeout` 是 **socket 空闲超时**（已建立连接后多久没数据就断开），不是 TCP 握手超时。TCP 连接建立超时由 undici（Node.js 内置 HTTP 客户端）控制，默认 10s。从 Vercel HK 访问国内服务（火山方舟等）TCP 握手可能超过 10s。

**正确做法**：用 undici 原生 `Agent` + `connectTimeout`：

```ts
import { Agent } from "undici"

const agent = new Agent({
  connectTimeout: 30_000,  // ← 这才是 TCP 连接超时
  connect: { rejectUnauthorized: false },
})

await fetch(url, { dispatcher: agent } as any)
```

需要 `npm install undici`（即使 Node.js 内置，也要装 npm 包提供 TypeScript 类型），并在 `next.config.ts` 加 `serverExternalPackages: ["undici"]`。

**判别**：日志出现 `ConnectTimeoutError: timeout: 10000ms` 且你明明设了 `timeout: 30000` → 就是这个坑。

## 重要规则

- **不要自行切换 API**：遇到 API 端点报错（如 404、400）时，先分析清楚兼容性和影响范围，确认变更是否会影响其他已有功能模块。向用户说明分析结论，得到确认回复后再执行修改。禁止未经确认直接替换 API 端点或模型。
- **换 AI 模型 ≠ 换 model 参数**：不同模型的输入范式可能完全不同（文本生图 vs 多图融合 vs 图生图）。切换前先搞清楚：模型吃什么输入？文字？图片？几张？什么格式？这会颠覆上游整条 pipeline，不只是改一行 model 名。
