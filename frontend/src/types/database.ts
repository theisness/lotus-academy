/**
 * 数据库模型类型定义
 * 对应 Supabase PostgreSQL 表结构
 */

/** 用户角色 */
export type UserRole = 'admin' | 'user'

/** 书架/书籍类型 */
export type ShelfType = 'public' | 'private'

/** 页面偏好 */
export type PagePreference = 'public' | 'private' | null

/** 批注类型 */
export type AnnotationType = 'highlight' | 'note'

/** 消息类型 */
export type MessageType = 'book_upload' | 'annotation' | 'book_update'

/**
 * 用户资料 — profiles 表
 * 扩展 Supabase Auth 的 auth.users 表
 */
export interface UserProfile {
  id: string
  nickname: string | null
  avatar_url: string | null
  bio: string | null
  email: string | null
  role: UserRole
  group_tags: string[]
  page_preference: PagePreference
  created_at: string
  updated_at: string
}

/**
 * 书籍 — books 表
 */
export interface Book {
  id: string
  title: string
  author: string | null
  description: string | null
  cover_url: string | null
  file_path: string
  type: ShelfType
  uploader_id: string
  published_date: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * 批注位置数据 — pdfjs 坐标格式
 * 包含页码、边界矩形、文本范围等信息
 */
export interface AnnotationPosition {
  boundingRect: {
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
    pageNumber?: number
  }
  rects: Array<{
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
    pageNumber?: number
  }>
  pageNumber: number
}

/**
 * 批注 — annotations 表
 */
export interface Annotation {
  id: string
  book_id: string
  user_id: string
  type: AnnotationType
  position: AnnotationPosition
  color: string | null
  content: string | null
  page_number: number
  created_at: string
  updated_at: string
}

/**
 * 栏目 — categories 表
 */
export interface Category {
  id: string
  name: string
  shelf_type: ShelfType
  owner_id: string
  sort_order: number
  created_at: string
}

/**
 * 书籍-栏目关联 — book_categories 表
 */
export interface BookCategory {
  id: string
  book_id: string
  category_id: string
}

/**
 * 书籍分组标签 — book_group_tags 表
 */
export interface BookGroupTag {
  id: string
  book_id: string
  group_tag: string
}

/**
 * 消息 — messages 表
 */
export interface Message {
  id: string
  type: MessageType
  title: string
  content: string
  related_book_id: string | null
  related_annotation_id: string | null
  related_page_number: number | null
  created_at: string
}

/**
 * 用户消息 — user_messages 表
 */
export interface UserMessage {
  id: string
  user_id: string
  message_id: string
  is_read: boolean
  read_at: string | null
}


