# CLAUDE.md

莲花书院 (Lotus Academy) — 中文藏书社区（公共书架 / 个人书房 / PDF 在线批注 / 站内信）。

## 架构要点（读代码看不出来的部分）

**Serverless-first：没有传统后端**。所有业务逻辑都在 PostgreSQL 的 RLS 策略 + PostgREST 里，前端经 `@supabase/ssr` / `@supabase/supabase-js` 直连 Supabase。改「后端逻辑」= 改 `backend/supabase/migrations/` 里的 RLS 策略，别去找 API 路由。

请求链路：`Next.js → Supabase JS SDK`，服务端侧 `Nginx :80 → Kong :8003 → GoTrue / PostgREST / Realtime / Storage`（路由表在 `backend/kong.yml`）。

## 约定

- 前端 dev server 跑在 **3004**（非 Next.js 默认 3000）。
- **没有测试套件**，别去找 `npm test`。
- 部署：`script/deploy.sh` + `script/nginx.conf`（Supabase 走 docker compose，Next.js 走 systemd）。
