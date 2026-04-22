/**
 * 组件 Props 类型定义
 */

import type { Book, Category } from './database'
import type { BookMetadata, MessageWithDetails } from './common'

/** 书籍网格组件 Props */
export interface BookGridProps {
  books: Book[]
  columns: number
  loading: boolean
  onBookClick: (book: Book) => void
  onEditClick?: (book: Book) => void
  onInfoClick?: (book: Book) => void
  onReorder?: (bookIds: string[]) => void
  canReorder?: boolean
}

/** 栏目标签页组件 Props */
export interface CategoryTabsProps {
  categories: Category[]
  activeId: string | null
  onSelect: (id: string) => void
}

/** 搜索栏组件 Props */
export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/** 书籍上传按钮组件 Props */
export interface BookUploadButtonProps {
  shelfType: 'public' | 'private'
  onUpload: (file: File) => void
}

/** 书籍编辑弹窗组件 Props */
export interface BookEditDialogProps {
  book: Book
  open: boolean
  onClose: () => void
  onSave: (data: Partial<BookMetadata>) => void
  groupTags?: string[]
onGroupTagsChange?: (tags: string[]) => void
  onDelete?: (bookId: string) => void
}

/** PDF 阅读器组件 Props */
export interface PdfReaderProps {
  bookId: string
  fileUrl: string
  canAnnotate: boolean
}

/** 消息盒子组件 Props */
export interface MessageBoxProps {
  messages: MessageWithDetails[]
  unreadCount: number
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

/** 通知徽标组件 Props */
export interface NotificationBadgeProps {
  count: number
}

/** 栏目管理窗口组件 Props */
export interface CategoryManagerProps {
  open: boolean
  onClose: () => void
  shelfType: 'public' | 'private'
  books: Book[]
  categories: Category[]
  onCreateCategory: (name: string) => Promise<Category>
  onUpdateCategory: (id: string, name: string) => Promise<void>
  onDeleteCategory: (id: string) => Promise<void>
  onAddBookToCategory: (categoryId: string, bookId: string) => Promise<void>
  onRemoveBookFromCategory: (categoryId: string, bookId: string) => Promise<void>
}


