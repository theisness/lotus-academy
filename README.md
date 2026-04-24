# 莲花书院

全中文在线书城 — 公共书架浏览、个人书架管理、PDF 在线阅读与批注。

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-18-61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-Self--Hosted-3ECF8E)
![License](https://img.shields.io/badge/License-MIT-blue)

## 功能特性

- 📚 **公共书架** — 管理员上传书籍，按栏目分类，分组标签控制可见性
- 📖 **个人书架** — 用户上传私有 PDF，自建栏目，可一键收藏公共书籍
- 🔍 **PDF 阅读器** — 翻页/滚动模式、单页/双页、缩放、全文搜索、章节目录
- 🖍️ **批注系统** — 多色文本高亮 + 备注，管理员批注全员可见
- 📝 **页面笔记** — 所有登录用户可在任意页面添加笔记
- 👥 **用户管理** — 角色分配（管理员/普通用户）、分组标签管理
- 🔔 **消息通知** — 书籍上传/更新/批注等系统事件实时通知
- 💾 **阅读状态记忆** — 每本书的页码、缩放、显示模式自动保存恢复
- 🔐 **权限控制** — 全表 RLS 策略，前后端双重权限校验

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

| 层 | 技术 |
|----|------|
| 前端框架 | Next.js 15 (App Router) / React 18 / TypeScript |
| 样式 | Tailwind CSS 4 / Framer Motion |
| PDF 渲染 | pdfjs-dist / react-pdf-highlighter-extended |
| 后端 | Supabase 自托管 (PostgreSQL 15 + Auth + Storage + Realtime) |
| 部署 | Docker Compose + Nginx |

## 目录结构

```
├── frontend/                  # Next.js 前端应用
│   └── src/
│       ├── app/               # 页面路由 (App Router)
│       ├── components/        # UI 组件
│       │   ├── bookshelf/     # 书架相关组件
│       │   ├── reader/        # PDF 阅读器（~3400 行）
│       │   ├── layout/        # 布局组件
│       │   └── providers/     # Context Providers
│       ├── hooks/             # 数据交互 Hooks
│       ├── lib/               # Supabase 客户端初始化
│       └── types/             # TypeScript 类型定义
├── backend/                   # Supabase 配置与数据库
│   ├── supabase/migrations/   # SQL 迁移文件（表/函数/RLS）
│   ├── kong.yml               # API 网关路由配置
│   └── docker-compose.yml     # 后端服务编排（开发用）
├── docker/                    # 完整部署编排
│   ├── docker-compose.yml     # 全套服务（含 Nginx + 前端）
│   ├── Dockerfile.frontend    # 前端构建镜像
│   └── .env.example           # 环境变量模板
├── script/                    # 运维脚本
│   ├── generate_env.sh        # 自动生成 .env（含密钥生成）
│   ├── backend_online.sh      # 远程部署后端
│   ├── frontend_build.sh      # 前端构建
│   ├── frontend_deploy.sh     # 前端部署到服务器
│   ├── run_migrations.sh      # 远程执行数据库迁移
│   ├── nginx-lotus.conf       # Nginx 配置模板
│   └── win/                   # Windows PowerShell 版本
└── docs/                      # 更新日志
```

## 快速开始

### 前置要求

- Node.js 18+
- Docker & Docker Compose
- （部署）Linux 服务器 + 域名

### 本地开发

**1. 启动后端（Supabase）**

```bash
cd backend
cp .env.example .env            # 使用默认开发配置即可
docker compose up -d
```

**2. 启动前端**

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                      # http://localhost:3004
```

首位注册用户自动成为管理员。

### 生产部署

**方式一：一键部署脚本**

```bash
# 1. 生成环境变量（自动生成安全密钥）
bash script/generate_env.sh

# 2. 部署后端到服务器
bash script/backend_online.sh

# 3. 构建并部署前端
bash script/frontend_build.sh
bash script/frontend_deploy.sh

# 4. 部署 Nginx
bash script/nginx_deploy.sh
```

**方式二：Docker Compose 全套**

```bash
cd docker
cp .env.example .env            # 编辑环境变量
docker compose up -d
```

启动后访问：
- 应用：`http://localhost`
- Supabase Studio：`http://localhost:3002`

### 环境变量说明

参考 `docker/.env.example`，关键配置：

| 变量 | 说明 |
|------|------|
| `SITE_URL` | 站点对外 URL |
| `POSTGRES_PASSWORD` | 数据库密码 |
| `JWT_SECRET` | JWT 签名密钥（≥32 字符） |
| `ANON_KEY` | Supabase 匿名密钥（前端用） |
| `SERVICE_ROLE_KEY` | Supabase 服务端密钥（勿暴露） |
| `SMTP_*` | 邮件服务配置（邮箱验证需要） |

> 使用 `script/generate_env.sh` 可自动生成安全的随机密钥。

## 数据库

8 张核心表，全部启用 RLS：

| 表 | 说明 |
|----|------|
| `profiles` | 用户资料，扩展 auth.users |
| `books` | 书籍元数据 |
| `annotations` | 高亮批注 + 页面笔记 |
| `categories` | 栏目分类 |
| `book_categories` | 书籍-栏目关联 |
| `book_group_tags` | 书籍可见性分组标签 |
| `messages` | 系统消息 |
| `user_messages` | 用户-消息关联（已读状态） |

11 个数据库函数，6 个触发器，25 条 RLS 策略。

迁移文件位于 `backend/supabase/migrations/`，Docker 启动时自动执行。

## 权限模型

| 操作 | 管理员 | 普通用户 |
|------|--------|----------|
| 公共书籍上传/编辑/删除 | ✅ | ❌ |
| 公共书籍高亮批注 | ✅ 可操作所有人的 | ❌ 只能查看 |
| 公共书籍页面笔记 | ✅ 可操作所有人的 | ✅ 仅自己的 |
| 个人书架 | ✅ | ✅ 完全控制 |
| 收藏公共书籍到个人书架 | ✅ | ✅ |
| 用户角色/分组管理 | ✅ | ❌ |

## 许可

[MIT](LICENSE)
