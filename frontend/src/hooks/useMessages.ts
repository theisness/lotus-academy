'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { MessageWithDetails } from '@/types/common'
import type { UseMessagesReturn } from '@/types/hooks'

/**
 * useMessages Hook — 消息通知管理
 *
 * 提供消息列表查询、未读数量统计、单条已读标记和全部已读标记功能。
 * 通过 user_messages 关联查询 messages 表获取完整消息详情。
 * RLS 策略自动过滤，用户仅可查看自己的消息。
 */
export function useMessages(): UseMessagesReturn {
  const [messages, setMessages] = useState<MessageWithDetails[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  /**
   * 从数据库获取当前用户的所有消息
   * 通过 user_messages 关联查询 messages 表，按创建时间倒序排列
   * 未登录时跳过查询，避免无效 JWT 导致错误
   */
  const fetchMessages = useCallback(async () => {
    setLoading(true)

    try {
      // 先检查是否有有效会话，未登录时跳过查询
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessages([])
        setUnreadCount(0)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('user_messages')
        .select(`
          id,
          user_id,
          message_id,
          is_read,
          read_at,
          message:messages (
            id,
            type,
            title,
            content,
            related_book_id,
            related_annotation_id,
            related_page_number,
            created_at
          )
        `)
        .order('created_at', { referencedTable: 'messages', ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      // Supabase 关联查询返回的 message 字段为嵌套对象
      const formatted: MessageWithDetails[] = (data ?? [])
        .filter((item: Record<string, unknown>) => item.message !== null)
        .map((item: Record<string, unknown>) => ({
          id: item.id as string,
          user_id: item.user_id as string,
          message_id: item.message_id as string,
          is_read: item.is_read as boolean,
          read_at: item.read_at as string | null,
          message: item.message as MessageWithDetails['message'],
        }))
        .sort((a: MessageWithDetails, b: MessageWithDetails) =>
          new Date(b.message.created_at).getTime() -
          new Date(a.message.created_at).getTime()
        )

      setMessages(formatted)
      setUnreadCount(formatted.filter((m) => !m.is_read).length)
    } catch {
      setMessages([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  /**
   * 初始化时获取消息列表
   */
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  /**
   * 标记单条消息为已读
   * 更新 user_messages 表的 is_read 和 read_at 字段
   */
  const markAsRead = useCallback(
    async (userMessageId: string): Promise<void> => {
      const { error } = await supabase
        .from('user_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', userMessageId)

      if (error) {
        throw new Error(`标记已读失败: ${error.message}`)
      }

      // 更新本地状态
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMessageId
            ? { ...m, is_read: true, read_at: new Date().toISOString() }
            : m
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    },
    [supabase]
  )

  /**
   * 标记所有消息为已读
   * 批量更新当前用户所有未读消息
   */
  const markAllAsRead = useCallback(async (): Promise<void> => {
    const unreadIds = messages
      .filter((m) => !m.is_read)
      .map((m) => m.id)

    if (unreadIds.length === 0) return

    const { error } = await supabase
      .from('user_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .in('id', unreadIds)

    if (error) {
      throw new Error(`全部标记已读失败: ${error.message}`)
    }

    // 更新本地状态
    const now = new Date().toISOString()
    setMessages((prev) =>
      prev.map((m) =>
        m.is_read ? m : { ...m, is_read: true, read_at: now }
      )
    )
    setUnreadCount(0)
  }, [supabase, messages])

  const clearAll = useCallback(async (): Promise<void> => {
    if (messages.length === 0) return
    const { error } = await supabase
      .from('user_messages')
      .delete()
      .in('id', messages.map((m) => m.id))
    if (error) throw new Error(`清空消息失败: ${error.message}`)
    setMessages([])
    setUnreadCount(0)
  }, [supabase, messages])

  return {
    messages,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearAll,
  }
}
