# 莲花书院

全中文书城社区，提供公共书籍浏览、个人书架管理、在线 PDF 阅读与批注功能。

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js 15 (App Router, Turbopack) |
| UI | Tailwind CSS 4 + Framer Motion |
| 图标 | Phosphor Icons |
| PDF | pdfjs-dist + react-pdf-highlighter-extended |
| 后端 | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| 部署 | Docker Compose + Nginx 反向代理 |

## 功能概览

- **公共书架** — 管理员上传公共书籍，按栏目分类，支持分组标签控制可见性
- **个人书架** — 用户上传私有 PDF，自建栏目管理
- **在线阅读器** — PDF 渲染、翻页、缩放、多色文本高亮、页面笔记
- **批注系统** — 高亮批注持久化存储，支持备注文字
- **用户管理** — 管理员可管理用户角色和分组标签
- **消息通知** — 书籍上传、批注等事件的系统消息

## 项目结构

```
├── frontend/          # Next.js 前端
│   └── src/
│       ├── app/       # 页面路由
│       ├── components/# UI 组件
│       ├── hooks/     # 自定义 Hooks（数据交互）
│       ├── lib/       # Supabase 客户端
│       └── types/     # TypeScript 类型定义
├── backend/           # Supabase 配置
│   └── supabase/migrations/  # 数据库迁移文件
├── docker/            # Docker 部署配置
└── script/            # 部署脚本 + Nginx 配置
```

## 本地开发

### 前置条件

- Node.js 18+
- 运行中的 Supabase 实例（本地 Docker 或云端）

### 启动前端

```bash
cd frontend
cp .env.local.example .env.local   # 填入 Supabase URL 和 Anon Key
npm install
npm run dev                         # 默认端口 3004
```

### 完整部署（Docker）

```bash
cd docker
cp .env.example .env               # 配置环境变量
docker compose up -d
```

服务启动后：
- 前端：`http://localhost`
- Supabase Studio：`http://localhost:3002`

## 环境变量

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API 地址 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |

## 数据库

数据库通过迁移文件自动初始化，包含以下核心表：

- `profiles` — 用户资料
- `books` — 书籍元数据
- `annotations` — 高亮和笔记批注
- `categories` — 书架栏目
- `book_categories` — 书籍-栏目关联
- `book_group_tags` — 书籍可见性分组
- `messages` / `user_messages` — 系统消息

所有表均启用 RLS 行级安全策略。

## 许可

私有项目。
