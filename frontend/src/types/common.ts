/**
 * 共享工具类型定义
 */

import type { Annotation, Message, UserMessage } from './database'

/** 鉴权操作结果 */
export interface AuthResult {
  success: boolean
  error?: string
}

/** 书籍元数据（上传/编辑时使用） */
export interface BookMetadata {
  title: string
  author: string
  description: string
  cover_url: string
  published_date: string
}

/**
 * 批注输入数据
 * 创建批注时使用，排除服务端自动生成的字段
 */
export type AnnotationInput = Omit<
  Annotation,
  'id' | 'book_id' | 'user_id' | 'created_at' | 'updated_at'
>

/**
 * 消息详情（含关联的用户消息状态）
 * UserMessage 与 Message 的联合查询结果
 */
export interface MessageWithDetails extends UserMessage {
  message: Message
}
