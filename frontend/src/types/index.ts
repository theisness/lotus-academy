/**
 * 类型定义统一导出
 */

// 数据库模型类型
export type {
  UserRole,
  ShelfType,
  PagePreference,
  AnnotationType,
  MessageType,
  UserProfile,
  Book,
  AnnotationPosition,
  Annotation,
  Category,
  BookCategory,
  BookGroupTag,
  Message,
  UserMessage,
} from './database'

// 共享工具类型
export type {
  AuthResult,
  BookMetadata,
  AnnotationInput,
  MessageWithDetails,
} from './common'

// Hook 返回类型
export type {
  UseAuthReturn,
  UseBooksReturn,
  UseAnnotationsReturn,
  UseCategoriesReturn,
  UseMessagesReturn,
  UseUserManagementReturn,
} from './hooks'

// 组件 Props 类型
export type {
  BookGridProps,
  CategoryTabsProps,
  SearchBarProps,
  BookUploadButtonProps,
  BookEditDialogProps,
  PdfReaderProps,
  MessageBoxProps,
  NotificationBadgeProps,
} from './components'
