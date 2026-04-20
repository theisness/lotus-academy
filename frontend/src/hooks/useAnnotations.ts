'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Annotation } from '@/types/database'
import type { AnnotationInput } from '@/types/common'
import type { UseAnnotationsReturn } from '@/types/hooks'

/**
 * useAnnotations Hook — 批注管理
 *
 * 提供批注的增删改查功能。
 * 加载书籍时从数据库还原所有已保存批注，
 * RLS 策略自动处理权限过滤：
 * - 私有书籍批注：仅书籍所有者可见
 * - 公共书籍批注：所有有权查看该书籍的用户可见
 *
 * @param bookId - 书籍 ID
 */
export function useAnnotations(bookId: string): UseAnnotationsReturn {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  /**
   * 从数据库获取指定书籍的所有批注
   * RLS 自动过滤无权限的批注
   */
  const fetchAnnotations = useCallback(async () => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('book_id', bookId)
        .order('created_at', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      setAnnotations((data as Annotation[]) ?? [])
    } catch {
      // RLS 会自动过滤无权限的批注，静默处理错误
      setAnnotations([])
    } finally {
      setLoading(false)
    }
  }, [supabase, bookId])

  /**
   * 监听 bookId 变化，重新获取批注列表
   */
  useEffect(() => {
    if (bookId) {
      fetchAnnotations()
    }
  }, [fetchAnnotations, bookId])

  /**
   * 创建新批注
   * 批注数据包含 position（JSONB）、color、content、page_number、type
   */
  const addAnnotation = useCallback(
    async (data: AnnotationInput): Promise<Annotation> => {
      const { data: inserted, error } = await supabase
        .from('annotations')
        .insert({
          book_id: bookId,
          type: data.type,
          position: data.position,
          color: data.color || null,
          content: data.content || null,
          page_number: data.page_number,
        })
        .select()
        .single()

      if (error) {
        throw new Error(`批注创建失败: ${error.message}`)
      }

      const newAnnotation = inserted as Annotation

      // 更新本地状态
      setAnnotations((prev) => [...prev, newAnnotation])

      return newAnnotation
    },
    [supabase, bookId]
  )

  /**
   * 更新批注
   * 支持部分更新（颜色、内容、位置等）
   */
  const updateAnnotation = useCallback(
    async (id: string, data: Partial<AnnotationInput>): Promise<void> => {
      const { error } = await supabase
        .from('annotations')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        throw new Error(`批注更新失败: ${error.message}`)
      }

      // 更新本地状态
      setAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === id
            ? { ...ann, ...data, updated_at: new Date().toISOString() }
            : ann
        )
      )
    },
    [supabase]
  )

  /**
   * 删除批注
   * RLS 校验权限：私有书籍仅所有者可删除，公共书籍仅管理员可删除
   */
  const deleteAnnotation = useCallback(
    async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('annotations')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(`批注删除失败: ${error.message}`)
      }

      // 更新本地状态
      setAnnotations((prev) => prev.filter((ann) => ann.id !== id))
    },
    [supabase]
  )

  return {
    annotations,
    loading,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
  }
}
