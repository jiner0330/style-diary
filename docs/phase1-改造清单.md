# 搭搭 Phase 1 · P0 改造清单

> 基于 dada-ai-Phase1-任务拆解.md + 低保真原型 v2 对齐后的落地清单。

## 核心转变

「手动试衣（拖拽单品穿到模特）」→「衣橱为中心 + 对话式搭配（勾选单品 → 问搭搭 → 结构化卡片 → 异步生图）」。

## 已对齐的决策

- 载体：**新建 `/wardrobe`**，旧 `/dressing` 只下线入口（代码暂留死代码）。
- 勾选语义：**优先用勾选的、允许搭搭建议补充**。
- 勾选状态：页面局部 `useState<Set<string>>`，不进全局 store。
- 建议补充：即时层**文字占位**，异步层合成进模特图。
- 建议补充的 `source` 标注（`user`/`suggested`）：给前端渲染用（有图 vs 文字），不是给 Seedream。
- 异步生图：**方案 A**（FC 同步生图 + 前端占位条 await 回填），不做真队列。
- 试衣：先下线入口。

## P0 任务清单

### P0-1 改上传落地路由
- `src/app/page.tsx`：`handleUpload` 里 `/dressing` → `/wardrobe`。

### P0-2 衣橱主页（新建）
- 新建 `src/app/wardrobe/page.tsx`：2 列网格 + 勾选 + 空状态 + 上传入口。
- 复用 `usePersonalWardrobe`、上传逻辑（POST /api/wardrobe + saveGuestItem）。

### P0-3 衣橱 + 搭搭合并同屏
- 底部常驻输入框 + 勾选 id 传 `/api/chat`（复用 selectedBlock 机制）。
- `getSystemPrompt` 改「必须先 list_items、锚定勾选单品、禁止跳过」。

### P0-4 搭搭回复即时层
- `/api/chat` 输出加 `source: user|suggested`。
- 新建 `OutfitPlanCard`（标题 + 单品 + 理由 + 占位条）。

### P0-5 砍掉试衣主线（下线入口）
- 场景详情页「开始搭配」→ 改跳 `/wardrobe` 或去掉。
- 旧 `dressing`/`outfit/*` 代码保留。

## 执行顺序

1. P0-1 + P0-2 + P0-5（骨架）
2. P0-3 + P0-4（核心闭环）
3. P1：#8 场景标签 + #6 多模特 + #7 异步生图
4. P2：登录/历史
