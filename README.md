# 🦊 风格日记 Style Diary

一个 AI 驱动的穿搭搭配工具。上传你的衣服，搭搭会根据天气和场合推荐搭配方案，还能生成模特上身效果图。

🔗 **https://dada-ai.cn** — 手机浏览器打开即用

## ✨ 功能

- **线上衣橱** — 拍照上传衣服，AI 自动识别品类、颜色、材质
- **场景搭配** — 选择场合（通勤/约会/商务等），AI 根据天气和场景推荐搭配
- **上身效果图** — 一键生成模特试穿效果，正面背面都能看
- **智能点评** — 四维打分：颜色和谐度、场合契合度、版型协调、时尚感
- **搭配收藏** — 保存你喜欢的搭配方案

## 🛠 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js 16 (App Router) |
| 数据库 | Supabase (上海) |
| AI 生图 | GPT Image 2 (via ofox.ai) |
| 视觉识别 | GPT-4o |
| AI 对话 | DeepSeek |
| 短信服务 | 阿里云 SMS (FC 上海) |
| 加速 | 阿里云 ESA |
| 部署 | Vercel HK |

## 🏗 架构

```
用户（国内）
  ├─ 阿里云 ESA 边缘加速 → Vercel HK (Next.js)
  │   ├─ ofox.ai (AI 生图 / 视觉识别)
  │   └─ DeepSeek (对话)
  ├─ 阿里云 FC 上海 → 阿里云 SMS + Supabase
  └─ supabase-js 客户端 → Supabase 上海
```

## 🚀 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（端口 4000，非标准端口在 iOS 上会被拦截）
npm run dev -- -p 4000

# 构建
npm run build
```

项目运行需要以下环境变量：

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务端密钥 |
| `DEEPSEEK_API_KEY` | DeepSeek API |
| `OFOXAI_API_KEY` | ofox.ai API（GPT-4o + GPT Image 2） |
| `QWEATHER_KEY` | 和风天气 API |
| `ALIBABA_ACCESS_KEY_ID` | 阿里云 AK（短信） |
| `ALIBABA_ACCESS_KEY_SECRET` | 阿里云 SK（短信） |
| `PHONE_USER_SECRET` | 手机号登录密码加密密钥 |
| `SITE_URL` | 站点地址 |
| `NEXT_PUBLIC_FC_SEND_SMS_URL` | 短信发送 FC 地址 |
| `NEXT_PUBLIC_FC_VERIFY_SMS_URL` | 验证码校验 FC 地址 |

## 📄 许可证

MIT

---

Made with AI Vibecoding 🦊
