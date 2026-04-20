# 莲花书院

全中文书城社区 — 公共书籍浏览、个人书架管理、在线 PDF 阅读与批注。

## 架构

```
┌────────────┐      ┌──────────────────────────────────┐
│   Nginx    │──────│  Next.js 15 (SSR + 静态)          │
│  反向代理   │      └──────────────────────────────────┘
│            │      ┌──────────────────────────────────┐
│            │──────│  Supabase (Kong API Gateway)      │
└────────────┘      │  ├─ PostgREST (REST API)          │
                    │  ├─ GoTrue (Auth)                  │
                    │  ├─ Storage (文件存储)              │
                    │  ├─ Realtime                       │
                    │  └─ PostgreSQL 15                  │
                    └──────────────────────────────────┘
```

无独立后端服务。前端通过 Supabase JS SDK 直接与数据库交互，权限由 PostgreSQL RLS 策略控制。

## 技术栈

- **前端**：Next.js 15 / React 18 / Tailwind CSS 4 / Framer Motion
- **PDF**：pdfjs-dist + react-pdf-highlighter-extended
- **后端**：Supabase (PostgreSQL + Auth + Storage + Realtime)
- **部署**：Docker Compose + Nginx

## 目录结构

```
├── frontend/              # Next.js 前端应用
│   └── src/
│       ├── app/           # 页面路由 (App Router)
│       ├── components/    # UI 组件
│       ├── hooks/         # 数据交互 Hooks
│       ├── lib/           # Supabase 客户端初始化
│       └── types/         # TypeScript 类型
├── backend/               # Supabase 配置与数据库迁移
│   ├── supabase/migrations/   # SQL 迁移文件
│   ├── kong.yml           # API 网关路由配置
│   └── docker-compose.yml # 后端独立启动（开发用）
├── docker/                # 完整部署编排
│   ├── docker-compose.yml # 全套服务编排
│   ├── Dockerfile.frontend
│   └── .env.example
├── script/                # 运维脚本
│   ├── deploy.sh
│   └── nginx.conf
└── public/                # 静态资源
```

## 快速开始

### 本地开发（仅前端）

```bash
cd frontend
cp .env.local.example .env.local   # 配置 Supabase 连接
npm install
npm run dev                         # http://localhost:3004
```

### 完整部署（Docker 一键启动）

```bash
cd docker
cp .env.example .env               # 编辑环境变量
docker compose up -d
```

启动后访问：
- 应用：`http://localhost`
- Supabase Studio：`http://localhost:3002`

## 核心功能

| 功能 | 说明 |
|------|------|
| 公共书架 | 管理员上传书籍，按栏目分类，分组标签控制可见性 |
| 个人书架 | 用户上传私有 PDF，自建栏目 |
| PDF 阅读器 | 翻页、缩放、多色高亮、页面笔记 |
| 批注系统 | 文本高亮 + 备注，持久化存储 |
| 用户管理 | 角色分配、分组标签管理（管理员） |
| 消息通知 | 书籍上传/批注等系统事件通知 |

## 数据库

8 张核心表，全部启用 RLS：

`profiles` · `books` · `annotations` · `categories` · `book_categories` · `book_group_tags` · `messages` · `user_messages`

迁移文件位于 `backend/supabase/migrations/`，Docker 启动时自动执行。

## 许可

私有项目。
