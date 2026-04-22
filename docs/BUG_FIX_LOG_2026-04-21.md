# Bug 修复日志 - 2026-04-21

## 修复的 Bug 列表

### Bug 1: 非管理员查看公共书籍信息按钮

**问题描述**:
非管理员（包括未登录用户）看到公共书籍时，没有按钮可以查看作者、标题、日期、描述等信息。

**修复方案**:
1. 在 `BookGrid` 组件中添加 `onInfoClick` 回调
2. 创建新的 `BookInfoDialog` 组件，显示书籍详细信息
3. 非管理员用户看到 "i" 信息按钮，点击可查看详情
4. 管理员用户看到编辑按钮（保持原有行为）

**修改的文件**:
- `frontend/src/components/bookshelf/BookGrid.tsx` - 添加信息按钮
- `frontend/src/components/bookshelf/BookInfoDialog.tsx` - 新建信息对话框
- `frontend/src/components/bookshelf/BookshelfClient.tsx` - 集成信息对话框
- `frontend/src/types/components.ts` - 更新类型定义

**测试方法**:
1. 以非管理员身份登录或未登录状态
2. 访问公共书架
3. 鼠标悬停在书籍卡片上，应看到 "i" 信息按钮
4. 点击按钮，应弹出书籍详情对话框

---

### Bug 2: 分组标签自动搜索匹配

**问题描述**:
书籍编辑对话框中设置可见性时，填入分组标签没有自动搜索匹配的分组名称。

**修复方案**:
1. 在 `BookEditDialog` 组件中添加标签输入监听
2. 输入时自动查询 `book_group_tags` 表中匹配的标签
3. 显示下拉建议列表，用户可点击选择
4. 过滤掉已选择的标签

**修改的文件**:
- `frontend/src/components/bookshelf/BookEditDialog.tsx` - 添加标签搜索和建议功能

**实现细节**:
- 使用 `ilike` 进行模糊搜索
- 限制返回 5 条建议
- 延迟关闭建议列表（200ms）以允许点击选择
- 自动过滤已选标签

**测试方法**:
1. 以管理员身份登录
2. 编辑一本公共书籍
3. 在"可见性设置"区域输入分组标签
4. 应看到下拉建议列表
5. 点击建议可快速添加标签

---

### Bug 3: 管理员设置分组标签后看不见书籍

**问题描述**:
管理员给公共书籍设置了分组标签后，自己却看不见这本书了。

**根本原因**:
`is_book_visible` 函数没有考虑管理员权限，管理员应该始终能看到所有公共书籍。

**修复方案**:
修改 `is_book_visible` 函数，在检查分组标签之前先判断用户是否为管理员：
- 如果是管理员，直接返回 `TRUE`
- 否则继续原有的分组标签检查逻辑

**修改的文件**:
- `backend/supabase/migrations/20250101000002_create_functions_triggers.sql` - 更新函数逻辑

**SQL 修改**:
```sql
-- 公共书籍：管理员始终可见
IF viewer_id IS NOT NULL THEN
  SELECT role INTO viewer_role
  FROM profiles
  WHERE id = viewer_id;
  
  IF viewer_role = 'admin' THEN
    RETURN TRUE;
  END IF;
END IF;
```

**部署步骤**:
需要在数据库中执行更新后的函数：
```sql
-- 连接到数据库后执行更新后的 is_book_visible 函数
```

**测试方法**:
1. 以管理员身份登录
2. 给一本公共书籍设置分组标签
3. 刷新页面，管理员应该仍然能看到这本书
4. 以普通用户身份登录（没有对应分组标签）
5. 应该看不到这本书

---

### Bug 4: 字体需要联网下载

**问题描述**:
页面加载时需要从网络下载字体，速度很慢。

**修复方案**:
1. 字体文件已存在于 `frontend/src/app/fonts/` 目录
2. 修改 `layout.tsx`，使用 `next/font/local` 加载本地字体
3. 移除 `geist` npm 包的依赖（字体加载部分）

**修改的文件**:
- `frontend/src/app/layout.tsx` - 使用本地字体加载

**实现细节**:
```typescript
import localFont from "next/font/local";

const GeistSans = localFont({
  src: [{ path: "./fonts/GeistVF.woff", style: "normal", weight: "100 900" }],
  variable: "--font-geist-sans",
  display: "swap",
});

const GeistMono = localFont({
  src: [{ path: "./fonts/GeistMonoVF.woff", style: "normal", weight: "100 900" }],
  variable: "--font-geist-mono",
  display: "swap",
});
```

**优势**:
- 字体随应用一起部署，无需网络请求
- 加载速度更快
- 离线可用
- `display: "swap"` 确保文本立即可见

**测试方法**:
1. 清除浏览器缓存
2. 打开开发者工具 Network 面板
3. 刷新页面
4. 确认没有外部字体请求（如 fonts.gstatic.com）
5. 字体应该从本地 `_next/static/media/` 加载

---

### Bug 5: 前端页面经常空白

**问题描述**:
前端页面经常空白，刷新几次又有了，没有报错。

**根本原因**:
1. **关键问题**: `getUser()` 接口没有被调用，导致认证状态无法初始化
2. Middleware 中的 `getUser()` 调用可能抛出未捕获的异常
3. `useAuth` hook 中的异步操作可能失败
4. `useBooks` 和 `useCategories` hooks 在错误时抛出异常，导致组件崩溃

**修复方案**:

#### 1. Middleware 优化
简化 middleware，确保 `getUser()` 总是被调用：
```typescript
try {
  await supabase.auth.getUser()
} catch (error) {
  console.error('Middleware getUser error:', error)
}
```

#### 2. useAuth Hook 重构
- 将 `getUser()` 调用移到独立的 `initAuth` 函数
- 确保初始化时立即调用，而不是等待 Promise 链
- 添加 `mounted` 标志防止内存泄漏
- 所有异步操作包裹在 try-catch 中

#### 3. useBooks Hook 优化
- 对于公共书架，错误时返回空数组而不是抛出错误
- 避免页面因数据加载失败而崩溃

#### 4. useCategories Hook 优化
- 同样的错误处理策略
- 公共书架错误时返回空数组

**修改的文件**:
- `frontend/src/middleware.ts` - 简化并确保 getUser() 被调用
- `frontend/src/hooks/useAuth.ts` - 重构初始化逻辑
- `frontend/src/hooks/useBooks.ts` - 优化错误处理
- `frontend/src/hooks/useCategories.ts` - 优化错误处理

**设计原则**:
- **必须调用**: `getUser()` 必须被调用，这是认证状态初始化的关键
- **优雅降级**: 数据加载失败时显示空状态，而不是白屏
- **静默错误**: 不影响用户体验的错误静默处理
- **日志记录**: 错误记录到控制台，便于调试

**测试方法**:
1. 清除浏览器缓存和 Cookie
2. 刷新页面多次
3. 检查 Network 面板，应该看到 `/api/auth/v1/user` 请求
4. 页面应该始终正常显示（即使数据加载失败）
5. 检查控制台，应该看到错误日志（如果有）
6. 模拟网络错误，页面不应崩溃

---

### Bug 7: 管理员修改公共书籍时卡住

**问题描述**:
管理员修改公共书籍时，仅修改书籍的作者信息，保存时会卡住，不调用接口。

**根本原因**:
1. `BookEditDialog` 的状态在 `book` prop 改变时没有重置
2. `handleEditSave` 缺少错误处理和日志
3. `updateBook` 缺少日志，难以调试

**修复方案**:

#### 1. BookEditDialog 状态同步
添加 `useEffect` 监听 `book` 和 `open` 变化，重置表单状态：
```typescript
useEffect(() => {
  if (open) {
    setCoverUrl(book.cover_url ?? '')
    setTitle(book.title)
    setAuthor(book.author ?? '')
    // ... 重置其他状态
  }
}, [book, open])
```

#### 2. handleEditSave 错误处理
添加 try-catch 和日志：
```typescript
try {
  console.log('[BookEdit] Saving book:', editingBook.id, data)
  await updateBook(editingBook.id, data)
  console.log('[BookEdit] Save successful')
  setEditingBook(null)
} catch (error) {
  console.error('[BookEdit] Save failed:', error)
  throw error
}
```

#### 3. updateBook 日志
添加详细日志便于调试：
```typescript
console.log('[useBooks] updateBook called:', { id, data })
// ... API 调用
console.log('[useBooks] Update successful')
```

**修改的文件**:
- `frontend/src/components/bookshelf/BookEditDialog.tsx` - 添加状态同步和错误处理
- `frontend/src/components/bookshelf/BookshelfClient.tsx` - 添加错误处理和日志
- `frontend/src/hooks/useBooks.ts` - 添加日志

**测试方法**:
1. 以管理员身份登录
2. 编辑一本公共书籍
3. 仅修改作者信息
4. 点击保存
5. 检查 Network 面板，应该看到 PATCH 请求
6. 检查 Console，应该看到日志输出
7. 对话框应该关闭，书籍信息应该更新

---

### Bug 8: PDF 阅读器加载时空白

**问题描述**:
进入阅读器会一片空白，直到鼠标滚动页面才会加载并渲染 PDF。

**根本原因**:
1. `PdfLoader` 的 `beforeLoad` 加载指示器没有正确显示
2. 缺少明确的加载状态管理
3. PDF 加载完成后没有通知 UI 更新

**修复方案**:

#### 1. 添加加载状态
```typescript
const [isLoading, setIsLoading] = useState(true)
```

#### 2. 显示加载指示器
在 PDF 加载期间显示明确的加载指示器：
```typescript
{isLoading && (
  <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900">
    <SpinnerGap />
    <p>正在加载 PDF...</p>
  </div>
)}
```

#### 3. 加载完成通知
修改 `PdfHighlighterWithPages` 组件，在 PDF 加载完成后通知父组件：
```typescript
useEffect(() => {
  onTotalPages(pdfDocument.numPages)
  if (onLoadComplete) {
    onLoadComplete()
  }
}, [pdfDocument, onTotalPages, onLoadComplete])
```

**修改的文件**:
- `frontend/src/components/reader/PdfReader.tsx` - 添加加载状态和指示器

**测试方法**:
1. 打开任意书籍进入阅读器
2. 应该立即看到"正在加载 PDF..."的提示
3. PDF 加载完成后，提示消失，内容显示
4. 不需要滚动页面就能看到内容

---

## 部署清单

### 前端部署准备
```powershell
# 下载 PDF.js worker 到本地（如果还没有）
# Worker 文件已包含在 frontend/public/pdf-worker/ 目录
# 如果需要更新版本，运行：
mkdir -p frontend/public/pdf-worker
curl -L -o frontend/public/pdf-worker/pdf.worker.min.mjs 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs'
```

### 前端部署
```powershell
# 1. 拉取最新代码
git pull

# 2. 安装依赖（如果 package.json 有变化）
cd frontend
npm install

# 3. 构建前端
npm run build

# 4. 部署前端
cd ..
.\script\frontend_online.ps1
```

### 后端部署（数据库函数更新）
```powershell
# 连接到数据库执行更新后的函数
# 方式 1: 通过 Supabase Studio
# 打开 http://localhost:3002 (本地) 或服务器上的 Studio
# 在 SQL Editor 中执行更新后的 is_book_visible 函数

# 方式 2: 通过 psql
psql -h localhost -p 5433 -U postgres -d postgres -f backend/supabase/migrations/20250101000002_create_functions_triggers.sql
```

### 验证步骤
1. ✅ 非管理员可以看到书籍信息按钮
2. ✅ 分组标签输入有自动建议
3. ✅ 管理员设置分组标签后仍能看到书籍
4. ✅ 字体从本地加载，无网络请求
5. ✅ 页面不再空白，错误时优雅降级
6. ✅ PDF worker 从本地加载，无外部请求
7. ✅ 管理员修改书籍信息正常保存
8. ✅ PDF 阅读器加载时显示加载指示器

---

## 后续优化建议

### 1. 错误监控
考虑添加错误监控服务（如 Sentry）来追踪生产环境的错误。

### 2. 加载状态优化
- 添加骨架屏加载动画
- 使用 Suspense 和 React.lazy 进行代码分割

### 3. 离线支持
- 考虑添加 Service Worker
- 实现离线缓存策略

### 4. 性能监控
- 添加性能指标收集
- 监控首屏加载时间

### 5. 测试覆盖
- 添加单元测试
- 添加集成测试
- 添加 E2E 测试

---

## 相关文档

- [部署脚本使用指南](../script/README_DEPLOYMENT.md)
- [部署配置说明](../script/DEPLOYMENT_CONFIG.md)
- [503 错误排查指南](../TROUBLESHOOTING_503.md)
