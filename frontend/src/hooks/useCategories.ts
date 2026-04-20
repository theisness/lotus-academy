'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Category, ShelfType } from '@/types/database'
import type { UseCategoriesReturn } from '@/types/hooks'

/**
 * useCategories Hook — 栏目管理
 *
 * 提供栏目的增删改查功能，以及栏目内书籍的添加和移除。
 * 通过 `shelfType` 参数区分公共书架栏目和个人书架栏目，
 * RLS 策略自动处理权限过滤：
 * - 公共栏目：仅管理员可增删改，所有人可查看
 * - 个人栏目：仅所有者可增删改查
 *
 * @param shelfType - 书架类型：'public'（公共书架）或 'private'（个人书架）
 */
export function useCategories(shelfType: ShelfType): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  /**
   * 从数据库获取栏目列表
   * 根据 shelfType 过滤书架类型，按 sort_order 排序
   */
  const fetchCategories = useCallback(async () => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('shelf_type', shelfType)
        .order('sort_order', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      setCategories((data as Category[]) ?? [])
    } catch {
      // RLS 会自动过滤无权限的栏目，静默处理错误
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [supabase, shelfType])

  /**
   * 监听 shelfType 变化，重新获取栏目列表
   */
  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  /**
   * 创建新栏目
   * sort_order 自动设置为当前最大值 + 1
   */
  const createCategory = useCallback(
    async (name: string): Promise<Category> => {
      const maxSortOrder = categories.length > 0
        ? Math.max(...categories.map((c) => c.sort_order))
        : -1

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name,
          shelf_type: shelfType,
          sort_order: maxSortOrder + 1,
        })
        .select()
        .single()

      if (error) {
        throw new Error(`栏目创建失败: ${error.message}`)
      }

      const newCategory = data as Category

      // 更新本地状态
      setCategories((prev) => [...prev, newCategory])

      return newCategory
    },
    [supabase, shelfType, categories]
  )

  /**
   * 更新栏目名称
   */
  const updateCategory = useCallback(
    async (id: string, name: string): Promise<void> => {
      const { error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', id)

      if (error) {
        throw new Error(`栏目更新失败: ${error.message}`)
      }

      // 更新本地状态
      setCategories((prev) =>
        prev.map((cat) => (cat.id === id ? { ...cat, name } : cat))
      )
    },
    [supabase]
  )

  /**
   * 删除栏目
   * 关联的 book_categories 记录会通过 ON DELETE CASCADE 自动清理
   */
  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(`栏目删除失败: ${error.message}`)
      }

      // 更新本地状态
      setCategories((prev) => prev.filter((cat) => cat.id !== id))
    },
    [supabase]
  )

  /**
   * 将书籍添加到栏目
   * 通过 book_categories 关联表建立多对多关系
   */
  const addBookToCategory = useCallback(
    async (categoryId: string, bookId: string): Promise<void> => {
      const { error } = await supabase
        .from('book_categories')
        .insert({
          category_id: categoryId,
          book_id: bookId,
        })

      if (error) {
        throw new Error(`书籍添加到栏目失败: ${error.message}`)
      }
    },
    [supabase]
  )

  /**
   * 从栏目中移除书籍
   * 删除 book_categories 关联表中的对应记录
   */
  const removeBookFromCategory = useCallback(
    async (categoryId: string, bookId: string): Promise<void> => {
      const { error } = await supabase
        .from('book_categories')
        .delete()
        .eq('category_id', categoryId)
        .eq('book_id', bookId)

      if (error) {
        throw new Error(`从栏目移除书籍失败: ${error.message}`)
      }
    },
    [supabase]
  )

  return {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    addBookToCategory,
    removeBookFromCategory,
  }
}
