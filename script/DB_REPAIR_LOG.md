# 莲花书院后端修复记录
**日期：2026-04-20**  
**问题现象：** 网站上线后所有 API 返回 503，登录返回 500，上传文件返回 400

---

## 背景知识（小白必读）

莲花书院的后端是 **Supabase 自托管版**，由以下几个 Docker 容器组成：

| 容器 | 作用 |
|------|------|
| `db` | PostgreSQL 数据库，存所有数据 |
| `rest` | PostgREST，把数据库表自动变成 REST API |
| `auth` | GoTrue，处理注册/登录 |
| `storage` | 处理文件上传（PDF、头像） |
| `kong` | API 网关，所有请求先经过它再分发 |
| `realtime` | WebSocket 实时推送 |

**关键概念：**
- **角色（Role）**：PostgreSQL 里的"用户"，每个服务用不同角色连接数据库
- **RLS（行级安全）**：数据库层面的权限控制，决定谁能读写哪些数据
- **Migration**：数据库结构变更脚本，按顺序执行建表、建索引等

---

## 问题根因

服务器上同时跑了多个 Supabase 实例（`lotus-academy-*` 和 `docker_*`），`lotus-academy` 的数据库是**全新的空库**，缺少 Supabase 运行所需的系统角色和 schema，导致所有服务启动失败。

---

## 修复步骤（按顺序）

### 第一步：定位根因 — rest 容器密码认证失败

**现象：** `rest` 容器日志报 `password authentication failed for user "authenticator"`

**原因：** `authenticator` 角色不存在（新数据库没有 Supabase 系统角色）

**修复：** 手动创建所有 Supabase 必需角色：
```sql
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE supabase_auth_admin NOINHERIT LOGIN PASSWORD '...';
CREATE ROLE supabase_storage_admin NOINHERIT LOGIN PASSWORD '...';
CREATE ROLE supabase_realtime_admin NOINHERIT LOGIN PASSWORD '...';
CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '...';
-- 授予角色成员关系
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
-- 创建必要 schema
CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;
CREATE SCHEMA storage AUTHORIZATION supabase_storage_admin;
CREATE SCHEMA realtime AUTHORIZATION supabase_realtime_admin;
```

---

### 第二步：auth 容器 — schema public 权限不足

**现象：** `auth` 容器报 `permission denied for schema public`

**修复：**
```sql
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT CREATE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON SCHEMA public TO supabase_auth_admin;
```

---

### 第三步：realtime 容器 — APP_NAME 环境变量缺失

**现象：** `realtime` 报 `APP_NAME not available`

**原因：** `docker-compose.yml` 里只有 `FLY_APP_NAME`，但容器需要 `APP_NAME`

**修复：** 在 `docker-compose.yml` 的 realtime 服务里加一行：
```yaml
APP_NAME: realtime
```
然后 `docker compose up -d --force-recreate realtime`（注意必须用 `up --force-recreate` 而不是 `restart`，否则新环境变量不生效）

---

### 第四步：auth 容器 — auth.factor_type 枚举类型缺失

**现象：** `auth` 报 `type "auth.factor_type" does not exist`

**原因：** GoTrue 的 migration 依赖这些枚举类型，但空库里没有

**修复：**
```sql
CREATE TYPE auth.factor_type AS ENUM ('totp', 'webauthn', 'phone');
CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');
CREATE TYPE auth.aal_level AS ENUM ('aal1', 'aal2', 'aal3');
CREATE TYPE auth.code_challenge_method AS ENUM ('s256', 'plain');
CREATE TYPE auth.one_time_token_type AS ENUM ('confirmation_token', ...);
-- 把所有权转给 supabase_auth_admin，否则它无法修改
ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;
-- 同理修改其他类型的 owner
```

---

### 第五步：auth 容器 — GoTrue 每次启动重跑所有 migration

**现象：** auth 容器反复重启，每次都从头跑 migration 并在中途失败

**原因：** `auth.schema_migrations` 表是空的，GoTrue 认为没有跑过任何 migration

**修复：** 把所有已知 migration 版本号插入表中，让 GoTrue 认为已完成：
```sql
INSERT INTO auth.schema_migrations (version) VALUES
('20171026211738'), ('20171026211808'), ... ON CONFLICT DO NOTHING;
```

---

### 第六步：创建 _realtime schema

**现象：** realtime 报 `no schema has been selected to create in`

**修复：**
```sql
CREATE SCHEMA IF NOT EXISTS _realtime AUTHORIZATION supabase_admin;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;
```

---

### 第七步：创建 postgres 角色

**现象：** auth 报 `role "postgres" does not exist`

**原因：** GoTrue 的某些 migration 需要给 `postgres` 角色授权

**修复：**
```sql
CREATE ROLE postgres SUPERUSER LOGIN PASSWORD '...';
GRANT ALL ON DATABASE postgres TO supabase_auth_admin;
GRANT ALL ON DATABASE postgres TO supabase_storage_admin;
```

---

### 第八步：运行项目 migrations

**现象：** REST API 返回 404，`public` schema 里没有业务表

**原因：** 项目的 migration 文件虽然挂载进了容器，但数据库 volume 已存在时不会自动执行

**修复：** 手动执行四个 migration 文件：
```bash
docker cp migrations/20250101000001_create_tables.sql db:/tmp/m1.sql
docker exec db psql -U supabase_admin -d postgres -f /tmp/m1.sql
# 同理执行 m2、m3、m4
```

---

### 第九步：授予 anon/authenticated 角色表权限

**现象：** API 返回 `permission denied for table categories`

**修复：**
```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
```

---

### 第十步：刷新 PostgREST schema cache

**现象：** PATCH profiles 返回空 `{}`（RLS 过滤掉了行）

**原因：** PostgREST 启动时缓存了 schema，后续改动不会自动感知

**修复：**
```bash
docker compose kill -s SIGUSR1 rest
```

---

### 第十一步：storage 上传 403

**现象：** 上传文件报 `new row violates row-level security policy`

**原因：** `supabase_storage_admin` 没有足够权限执行 `set_config` 切换角色上下文

**修复：**
```sql
GRANT authenticated TO supabase_storage_admin;
GRANT anon TO supabase_storage_admin;
GRANT service_role TO supabase_storage_admin;
ALTER ROLE supabase_storage_admin SUPERUSER;
```

---

## 最终状态

所有容器正常运行：

| 容器 | 状态 |
|------|------|
| db | healthy |
| kong | healthy |
| rest | up |
| auth | up |
| storage | up |
| realtime | up |

---

## 预防措施

为避免下次重建数据库再踩同样的坑，已创建两个脚本：

- `script/export_db.sh` — 每次改完数据库结构后运行，导出当前状态
- `script/rebuild_db.sh` — 重建数据库时运行，一键恢复到导出时的状态

导出的文件：
- `backend/supabase/init_roles.sql` — 所有角色定义
- `backend/supabase/init_schema.sql` — 完整 schema（表、函数、RLS、触发器）

**工作流：**
```
改数据库 → bash export_db.sh → git commit → 下次重建用 rebuild_db.sh
```
