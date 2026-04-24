# 更新日志 2026-04-24

## 批注/笔记权限体系重构

### RLS 策略（annotations 表）
- **INSERT**：管理员可插入任何类型（highlight/note）；普通登录用户只能插入 `type='note'`
- **UPDATE**：管理员可修改任何人的批注/笔记；普通用户只能修改自己的笔记
- **DELETE**：管理员可删除任何人的批注/笔记；普通用户只能删除自己的笔记
- **SELECT**：不变，可见书籍的所有批注都能看到

### 前端权限控制
- 新增 `canNote` 权限（所有登录用户 = true），与 `canAnnotate`（管理员 only）分离
- NotePanel 用 `canNote` 控制添加笔记 UI，用 `isAdmin || note.user_id === currentUserId` 控制编辑/删除按钮
- AnnotationPanel 用 `canAnnotate`（管理员）控制高亮的编辑/删除按钮
- HighlightPopup 用 `isOwner` 控制弹窗内操作按钮，非 owner 无 comment 时返回 null（修复黑线 bug）
- 非管理员文本选中显示黄色高亮（`::selection` rgba），但不创建批注

## 消息通知

### 触发器改为全用户
- `notify_public_book_annotation` 去掉 `IF v_annotator_role != 'admin'` 限制
- 任何用户在公共书籍写笔记/高亮都会通知所有可见该书的用户
- 默认昵称从 `'管理员'` 改为 `'用户'`

### 消息盒子清空修复
- **问题**：清空后刷新消息还在
- **根因**：`user_messages` 表缺少 DELETE RLS 策略，前端 delete 请求被静默拒绝
- **方案**：添加 `user_messages_delete` 策略（`user_id = auth.uid()`）

### 消息通知操作者昵称
- 三个 DB 触发器（upload/update/annotation）改为查询 `profiles.nickname`
- 已有旧消息批量更新

## 忘记密码

- `useAuth.ts` 新增 `resetPassword` 方法（`resetPasswordForEmail`）
- auth 页面新增 `'forgot'` 模式，仅邮箱输入
- 新增 `/reset-password/page.tsx`，新密码 + 确认密码表单

## 阅读器状态持久化

### localStorage 按书保存
- key: `reader-state-{bookId}`，保存 scrollType / displayMode / scale / currentPage
- 打开书时自动恢复所有状态

### 恢复时机修复
- **问题**：页码和缩放保存了但重新打开不生效
- **根因**：`setDocument` 后立即设置 `currentPageNumber`，页面还没渲染完被忽略
- **方案**：移到 `pagesloaded` 事件后设置页码和缩放

### 双页模式恢复修复
- **问题**：翻页+双页模式退出后重新打开变成单页
- **根因**：`onViewerReady` 设置 `spreadMode` 时机太早，被 viewer 内部初始化覆盖
- **方案**：在 `onLoadComplete`（pagesloaded 之后）再次设置 scrollMode 和 spreadMode

### 缩放按钮逻辑修复
- **问题**：点击放大/缩小按钮有时无反应，有时方向反
- **根因**：`actualScale` 不是 React state，toolbar 拿到过时的值导致 step 查找错误
- **方案**：`actualScale` 改为 `useState`，通过 `scalechanging` 事件和 `handleScaleChange` 同步更新

## 复制公共书籍到个人书架

### DB 函数
- `copy_book_to_personal(p_book_id UUID)` — SECURITY DEFINER
- 复制 title/author/description/cover_url/file_path/published_date
- 设 `type='private'`，`uploader_id=当前用户`
- PDF 文件共享同一个 file_path，不重复存储

### 前端
- ReaderToolbar 新增复制按钮（Copy 图标），仅公共书籍 + 已登录时显示
- 点击调用 `supabase.rpc('copy_book_to_personal')`

### 注意事项
- 管理员删除公共书籍时如果同时删除 Storage 文件，已复制的私有副本将无法打开 PDF

## 批注面板点击跳转
- AnnotationPanel 批注条目整体可点击（`cursor-pointer` + `onClick`）
- 点击直接跳转到对应高亮位置

---

## 文件变更清单

### 前端
| 文件 | 改动 |
|------|------|
| `ReaderClient.tsx` | canNote 权限、handleCopyToPersonal、onCopyToPersonal prop |
| `PdfReader.tsx` | 透传 canNote、onCopyToPersonal |
| `ReaderContent.tsx` | canNote→NotePanel、isAdmin→NotePanel、saveState、applyViewerModes、onLoadComplete 恢复模式 |
| `ReaderToolbar.tsx` | onCopyToPersonal 按钮、Copy 图标 |
| `PdfViewerCore.tsx` | initialPage prop、pagesloaded 恢复页码/缩放、scale effect log |
| `HighlightPopup.tsx` | isOwner=false 且无 comment 返回 null、非 owner 去掉 border-b |
| `AnnotationPanel.tsx` | 条目整体可点击跳转 |
| `NotePanel.tsx` | currentUserId + isAdmin props、编辑/删除按钮权限控制 |
| `hooks/useReaderState.ts` | localStorage 按书保存/恢复、saveState helper、actualScale 改为 state、笔记操作去掉 canAnnotate 限制 |
| `types.ts` | canNote、onCopyToPersonal 加入 PdfReaderProps |
| `hooks/useAuth.ts` | resetPassword 方法 |
| `app/auth/page.tsx` | forgot 模式 |
| `app/reset-password/page.tsx` | 新增 |
| `hooks/useMessages.ts` | clearAll 方法 |
| `components/layout/MessageBox.tsx` | 清空按钮 |

### 后端/数据库
| 文件/操作 | 改动 |
|-----------|------|
| `20250101000002_create_functions_triggers.sql` | annotation 触发器去掉 admin 限制、copy_book_to_personal 函数 |
| `20250101000003_create_rls_policies.sql` | annotations INSERT/UPDATE/DELETE 重写、user_messages_delete 策略 |
| 生产 DB | 以上策略/函数/触发器均已部署、PostgREST schema cache 已刷新 |

---

## PDF 阅读器模块统计

总计 3,421 行（含 useAnnotations.ts）

| 分组 | 文件 | 行数 | 复杂度 |
|------|------|------|--------|
| **核心渲染** | PdfViewerCore.tsx | 424 | 🔴 高 |
| | ReaderContent.tsx | 271 | 🟡 中 |
| **状态管理** | hooks/useReaderState.ts | 343 | 🔴 高 |
| | useAnnotations.ts | 157 | 🟡 中 |
| **工具栏** | ReaderToolbar.tsx | 596 | 🔴 高 |
| **侧边面板** | AnnotationPanel.tsx | 311 | 🟡 中 |
| | NotePanel.tsx | 332 | 🟡 中 |
| | SearchPanel.tsx | 129 | 🟢 低 |
| **弹窗/浮层** | HighlightPopup.tsx | 98 | 🟢 低 |
| | SelectionTip.tsx | 76 | 🟢 低 |
| | OutlinePanel.tsx | 111 | 🟢 低 |
| **入口/类型** | ReaderClient.tsx | 261 | 🟡 中 |
| | PdfReader.tsx | 70 | 🟢 低 |
| | ReaderClientWrapper.tsx | 39 | 🟢 低 |
| | types.ts | 22 | 🟢 低 |
| | constants.ts | 11 | 🟢 低 |
| **工具函数** | lib/pdf-utils.ts | 170 | 🟡 中 |

复杂度最高：ReaderToolbar（596）、PdfViewerCore（424）、useReaderState（343），占总量 40%，为优先重构对象。
