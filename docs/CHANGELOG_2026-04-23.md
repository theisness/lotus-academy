# 更新日志 2026-04-23

## PDF 阅读器

### 高亮悬停弹窗修复
- **问题**：鼠标悬停在高亮批注上不显示操作弹窗（编辑/删除/改色）
- **根因**：pdfjs textLayer 的文字 span 覆盖在高亮 overlay 上方，拦截了所有鼠标事件；React 合成事件在 `createRoot` 子树中无法触发
- **方案**：改用容器级 `mousemove` 事件 + 坐标碰撞检测，完全绕开 DOM 事件层级问题；用 `mouseOverPopupRef` ref 防止鼠标移到弹窗上时弹窗消失

### 高亮颜色修改
- HighlightPopup 新增颜色选择器（5 色圆点），点击即时更新数据库
- 修改颜色后弹窗内选中状态同步更新（`setHoveredHighlight` 更新 color）

### 翻页后高亮消失修复
- `pagechanging` 事件后延迟 50ms 重新渲染高亮，解决翻页模式下 textLayer 重建导致 overlay 丢失

### 搜索状态保持
- 关闭搜索面板不再清空搜索结果和索引，重新打开时保留上次搜索状态

### 笔记面板
- 笔记项点击跳转到对应页码
- 显示笔记作者昵称

## 用户系统

### Auth Lock 死锁修复
- **问题**：修改邮箱按钮一直转圈，控制台报 `Lock was released because another request stole it`
- **根因**：`onAuthStateChange` 回调是 `async` 的，内部 `await fetchProfile()` 长时间持有 Navigator Lock，导致 `updateUser` 内部的 session 刷新获取不到锁，超时后偷锁，Promise 被 reject 但错误被 SDK 吞掉
- **方案**：将 `onAuthStateChange` 回调改为同步函数，`fetchProfile` 用 `void (async () => { ... })()` fire-and-forget，回调立即返回释放锁

### 邮箱变更确认流程
- 新增 `/verify` 页面，处理邮件确认链接的 PKCE token 交换（`verifyOtp`）
- 修改邮箱成功提示改为"确认邮件已发送到新邮箱，请查收并点击确认链接"
- 添加 15 秒超时保底，防止 Promise 永久 pending

### SMTP 配置修复
- **问题**：修改邮箱返回 500 `Error sending email change email`
- **根因**：`GOTRUE_SMTP_SENDER_NAME` 有值但 `GOTRUE_SMTP_ADMIN_EMAIL` 缺失，发件人地址为 `"LotusAcademy" <>`
- **方案**：docker-compose 添加 `GOTRUE_SMTP_ADMIN_EMAIL: ${SMTP_USER:-}` 和 `GOTRUE_MAILER_EXTERNAL_HOSTS`

## 数据库

### 书籍排序修复
- **问题**：拖动排序返回 400，PostgREST 不认识 `sort_order` 字段
- **根因**：迁移已执行但 PostgREST schema cache 未刷新
- **方案**：`docker kill --signal=SIGUSR1 lotus-academy-rest-1` 刷新缓存；`run_migrations.sh` 末尾自动执行此命令

### RLS 策略调整
- `profiles_select` 从 `auth.uid() = id OR is_admin()` 改为 `auth.uid() IS NOT NULL`
- 所有登录用户可查看其他用户的 profile（昵称等），解决非管理员看不到批注/笔记作者的问题

### 消息通知触发器
- `notify_public_book_upload`、`notify_public_book_update`、`notify_public_book_annotation` 三个触发器改为从 profiles 表查询操作者昵称，替代硬编码的"管理员"
- 已有旧消息批量更新为实际昵称

## 消息盒子
- 新增"清空"按钮，删除当前用户所有历史消息

## PDF 缓存
- 前端 IndexedDB 缓存已下载的 PDF blob，同一本书第二次打开不再请求服务器
- Nginx 对 `/api/storage/v1/object/...*.pdf` 路径覆盖 `Cache-Control: public, max-age=86400`

## 运维脚本
- `run_migrations.sh` 重写：scp 上传 SQL 到服务器 → docker exec 执行 → 自动刷新 PostgREST schema cache
- 修正 DB 容器名为 `lotus-academy-db-1`，psql 命令添加 `PGPASSWORD`

## 文件变更清单

### 前端
- `src/components/reader/PdfViewerCore.tsx` — 高亮悬停改用 mousemove 检测，颜色修改支持
- `src/components/reader/HighlightPopup.tsx` — 重写，新增颜色选择器和 `onUpdateColor`
- `src/components/reader/NotePanel.tsx` — 笔记点击跳页，显示作者昵称
- `src/components/reader/ReaderContent.tsx` — 传递 `onHighlightUpdateColor`、`onNavigateToPage`
- `src/components/reader/hooks/useReaderState.ts` — `handleUpdateColor`，搜索关闭不清空结果
- `src/components/reader/ReaderClient.tsx` — IndexedDB PDF 缓存
- `src/components/layout/MessageBox.tsx` — 清空消息按钮
- `src/hooks/useMessages.ts` — `clearAll` 方法
- `src/hooks/useAuth.ts` — `onAuthStateChange` 改为同步回调
- `src/app/verify/page.tsx` — 新增，邮箱确认 token 交换
- `src/app/profile/page.tsx` — 邮箱修改超时保底，提示文案优化

### 后端/数据库
- `backend/supabase/migrations/20250101000002_create_functions_triggers.sql` — 三个触发器使用昵称
- `backend/supabase/migrations/20250101000003_create_rls_policies.sql` — profiles_select 放宽
- `docker/docker-compose.yml` — SMTP_ADMIN_EMAIL、MAILER_EXTERNAL_HOSTS

### 运维
- `script/run_migrations.sh` — 重写为远程执行 + PostgREST 刷新
- `script/nginx-lotus.conf` — PDF 缓存头
