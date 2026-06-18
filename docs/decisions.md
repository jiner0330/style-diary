# 技术决策记录

## 2026-05-23 聊天搭配流程改造：文字方案优先 + 用户选择生图

### 问题

用户输入搭配需求后，系统自动生成效果图。整个流程用户无选择权，且生图等待 30-180 秒，体验差。

### 决策

**从"自动生图"改为"文字优先 + 用户选择再生图"**

| 旧流程 | 新流程 |
|--------|--------|
| AI 出方案 → 自动穿衣服 → 自动生图 | AI 出 1-3 套文字方案 → 用户选择 → 生图 |
| AI 只能推荐衣橱已有单品 | AI 自由发挥，不限于衣橱 |
| 单品用 `#品类-ID` 格式标注 | 单品输出结构化 JSON（含 sub_category、hex 色值、版型等） |
| 生图后才调 evaluateOutfit | AI 文字方案自带预估分，不调 evaluateOutfit |
| maxTokens = 2000 | maxTokens = 4000 |

### 关键技术点

1. **AI 输出格式**：markdown + JSON code block，每件单品带完整属性。`sub_category` 约束到 `SUBCAT_ENUMS` 枚举值，确保生图精度。

2. **Agent 轮数优化**：系统提示词引导 AI 在第一轮同时调 `get_rules` + `get_formulas` + `list_items`，然后直接出方案，控制在 2 轮以内。

3. **AI 单品缓存**：store 新增 `aiItemsCache: Map<string, ClothingItem>`，AI 生成的单品用临时 ID 存入。`collectItems()` 同时查询 mock 数据 + 个人衣橱 + AI 缓存。

4. **生图入口**：新增 `handleGenerateFromAIItems()` 直接接收结构化单品数据调 ofox.ai GPT Image，不走 `collectItems()`。

5. **灵感收藏**：store 新增 `savedInspirations[]`，支持"收藏到灵感板"。

### 涉及文件

- `src/lib/matching-rules.ts` — 重写系统提示词
- `src/app/api/chat/route.ts` — maxTokens → 4000
- `src/components/chat/ChatPanel.tsx` — 去掉 auto-gen，新增方案解析和选择 UI
- `src/app/dressing/page.tsx` — 新增 AI 单品生图入口
- `src/store/outfit.ts` — AI 单品缓存 + 灵感收藏
- `src/types/index.ts` — 新增 AIOutfitPlan 等类型

---

## ~~2026-05-22 图片生成从 OfoxAI 切换到 Seedream 4.5~~ （已废弃）

> **2026-06-15 更新**：Seedream 方案后续被废弃。`/api/generate-ai-outfit`（豆包 Seedream）路由从未接入前端业务流，实际生图统一使用 `/api/generate-outfit` → ofox.ai → GPT Image (`openai/gpt-image-2`)。Seedream 相关代码和环境变量已清理。
>
> 原因：GPT Image 通过 ofox.ai 代理后生图质量满足需求，且流程统一（视觉识别和生图走同一代理），无需维护两套 API。

<details>
<summary>原始记录（保留存档）</summary>

### 问题

OfoxAI (GPT Image) 生成图片不准确，红色一字肩上衣变成挂脖。

### 决策

切换到 Seedream 4.5 (`doubao-seedream-4-5-251128`)，利用其 `negative_prompt` 和 `guidance_scale` 参数提高精度。

### 涉及文件

- `src/app/api/generate-outfit/route.ts` — 切换 API + 重写 prompt 构建
- `.env.local` — SEEDREAM_MODEL → `doubao-seedream-4-5-251128`

</details>

---

## 2026-05-22 移动端登录问题修复

### 问题

移动端登录失败，输入框清空。根因：
1. Next.js `allowedDevOrigins` 配置了无效的 `"192.168.*"` 通配符
2. Supabase 服务端请求 TLS 证书验证超时

### 修复

1. `next.config.ts`: `allowedDevOrigins` 改为 `["172.16.83.113", "192.168.1.6", "*"]`
2. `src/app/api/auth/login/route.ts`: 设置 `NODE_TLS_REJECT_UNAUTHORIZED=0`
3. 登录改为客户端直连 Supabase（`supabase.auth.signInWithPassword`），不走服务端中转
4. 表单增加 `action` 和 `method` 属性作为非 JS 环境的 fallback

---

## 2026-05-22 evaluateOutfit 集成

### 决策

将规则库中的 `evaluateOutfit()` 集成为 chat API 的第 6 个工具。

关键映射：app 的 `{category, sub_category}` → 规则库的 `CategoryId`（如 `top:shirt` → `top_shirt`），45 条映射记录。

### 涉及文件

- `src/lib/matching-rules.ts` — `evaluateCurrentOutfit()` 封装 + `toCategoryId()` 映射
- `src/app/api/chat/route.ts` — `EVALUATE_OUTFIT_TOOL` + handler
