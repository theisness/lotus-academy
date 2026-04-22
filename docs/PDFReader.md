阅读器功能细节总结

视图模式（两个独立维度，4种组合）

- 翻页方式 scrollType: 'scroll' | 'page'
    - scroll：PDF.js ScrollMode.VERTICAL，连续滚动
    - page：PDF.js ScrollMode.PAGE，单屏切换，页面垂直居中（CSS .pdfViewer.scrollPage flex 居中）

- 显示方式 displayMode: 'single' | 'double'
    - single：SpreadMode.NONE
    - double：SpreadMode.ODD

- 切换时自适应：单页用 page-width，双页用 page-fit，通过 viewer.currentScaleValue 设置后 requestAnimationFrame
  读取实际数值锁定到 state，后续翻页/滚动不会重新自适应
- 两个状态各自持久化到 localStorage（reader-scroll-type、reader-display-mode）

缩放

- 范围 25%-200%，步进 [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
- 桌面端：工具栏滑动条 + 放大缩小按钮
- 移动端：放大缩小按钮在溢出菜单中（onPointerUp 触发，兼容触屏）
- 初始 scale=1.0，onLoadComplete 时调用 applyViewerModes 自适应一次
- actualScale：scale 为 number 直接用，为 string 时从 viewer.currentScale 读取

翻页

- 工具栏上/下页按钮，双页模式 step=2，单页 step=1
- 侧边翻页箭头：仅 scrollType === 'page' 时显示，左右各一个 group 热区，鼠标移入渐显（opacity-0 →
  group-hover:opacity-100，duration-300），半透明背景
- 页码输入框支持直接跳转
- 滚动时通过 pagechanging 事件实时同步页码到工具栏

侧边面板（合并的批注+笔记）

- 一个按钮打开，角标显示 highlightCount + noteCount
- 顶部 tab 切换：批注 / 笔记，右侧关闭按钮
- 批注 tab（AnnotationPanel）：搜索、按颜色/有无备注筛选、按页分组、点击跳转、编辑备注、删除
- 笔记 tab（NotePanel）：搜索、按页筛选、新增（绑定当前页）、编辑、删除
- 两个面板支持 embedded 模式（无外层包装和关闭按钮）

章节目录

- OutlinePanel：从 pdfDocument.getOutline() 提取，树形展开，点击跳转

高亮批注

- 选中文本后弹出 SelectionTip，点击高亮按钮才创建（非自动）
- 多色高亮，颜色选择器桌面端在工具栏，移动端在溢出菜单
- .PdfHighlighter .textLayer ::selection { color: transparent } 修复文字重影

工具栏布局

- 左侧：返回 + 书名
- 中间：翻页按钮 + 页码输入 + 模式切换（桌面）+ 缩放滑动条（桌面）
- 右侧：颜色选择器（桌面，canAnnotate）+ 目录 + 侧边面板 + 溢出菜单（移动端）
- 溢出菜单（sm:hidden）：缩放、翻页方式、显示方式、高亮颜色
- 外部点击关闭用 pointerdown（兼容触屏）

PDF 缓存

- ReaderClient 用 IndexedDB（lotus-pdf-cache）缓存下载的 PDF blob
- 首次从 Supabase Storage 下载并缓存，再次打开同一本书从缓存读取

关键文件

- PdfReader.tsx：核心阅读器，状态管理、viewer 操作、面板渲染
- ReaderToolbar.tsx：工具栏 UI
- ReaderClient.tsx：书籍加载、PDF 缓存、权限判断
- AnnotationPanel.tsx：批注管理面板
- NotePanel.tsx：笔记面板
- OutlinePanel.tsx：章节目录
- globals.css：选区透明、翻页模式垂直居中
