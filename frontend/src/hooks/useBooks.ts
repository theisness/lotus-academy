'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Book, ShelfType } from '@/types/database'
import type { BookMetadata } from '@/types/common'
import type { UseBooksReturn } from '@/types/hooks'

// 在模块级别获取单例客户端，避免每次渲染创建新实例
const supabase = createClient()

/**
 * useBooks Hook — 书籍管理
 *
 * 提供书籍列表查询、搜索、上传、更新和删除功能。
 * 通过 `type` 参数区分公共书架和个人书架，
 * RLS 策略自动处理权限过滤（公共书籍可见性、私有书籍仅所有者可见）。
 *
 * @param type - 书架类型：'public'（公共书架）或 'private'（个人书架）
 */
export function useBooks(type: ShelfType): UseBooksReturn {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  /**
   * 从数据库获取书籍列表
   * 根据 type 过滤书架类型，根据 searchQuery 进行标题模糊搜索
   */
  const fetchBooks = useCallback(async () => {
    console.log('[useBooks] fetchBooks started, type:', type, 'searchQuery:', searchQuery)
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('books')
        .select('*')
        .eq('type', type)
        .order('sort_order', { ascending: true })

      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`)
      }

      console.log('[useBooks] Executing query...')
      const { data, error: fetchError } = await query
      console.log('[useBooks] Query result:', { dataLength: data?.length, error: fetchError?.message })

      if (fetchError) {
        // JWT 签名无效或 401 未授权时，说明存在过期/损坏的会话 token
        // 清除无效会话后重试，让请求以匿名身份执行
        const isAuthError = fetchError.message?.includes('JWS')
          || fetchError.message?.includes('JWT')
          || fetchError.message?.includes('invalid')
          || fetchError.code === 'PGRST301'
          || (fetchError as unknown as { status?: number }).status === 401
        if (isAuthError) {
          try {
            await supabase.auth.signOut()
          } catch {
            // 忽略 signOut 错误
          }
          
          let retryQuery = supabase
            .from('books')
            .select('*')
            .eq('type', type)
            .order('sort_order', { ascending: true })

          if (searchQuery.trim()) {
            retryQuery = retryQuery.ilike('title', `%${searchQuery.trim()}%`)
          }

          const { data: retryData, error: retryError } = await retryQuery

          if (retryError) {
            // 对于公共书架，即使出错也返回空数组而不是抛出错误
            // 这样可以避免页面崩溃
            if (type === 'public') {
              setBooks([])
              return
            }
            throw new Error(retryError.message)
          }
          setBooks((retryData as Book[]) ?? [])
          return
        }
        // 对于公共书架，即使出错也返回空数组
        if (type === 'public') {
          setBooks([])
          return
        }
        throw new Error(fetchError.message)
      }

      setBooks((data as Book[]) ?? [])
    } catch (err) {
      // 对于公共书架，设置空数组而不是错误状态
      if (type === 'public') {
        setBooks([])
      } else {
        setError(err instanceof Error ? err : new Error('获取书籍列表失败'))
      }
    } finally {
      setLoading(false)
    }
  }, [type, searchQuery])

  /**
   * 监听 type 和 searchQuery 变化，重新获取书籍列表
   */
  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  /**
   * 搜索书籍（按标题模糊匹配）
   * 更新 searchQuery 状态后自动触发 fetchBooks
   */
  const searchBooks = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  /**
   * 上传书籍
   * 1. 将 PDF 文件上传到 Supabase Storage 的 'books' bucket
   * 2. 将书籍元数据写入 books 表
   */
  const uploadBook = useCallback(
    async (file: File, metadata: BookMetadata): Promise<Book> => {
      // 生成唯一文件路径：type/timestamp_filename
      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${type}/${timestamp}_${safeName}`

      // 上传 PDF 文件到 Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('books')
        .upload(filePath, file, {
          contentType: 'application/pdf',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`文件上传失败: ${uploadError.message}`)
      }

      // 将书籍元数据写入 books 表
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error: insertError } = await supabase
        .from('books')
        .insert({
          title: metadata.title,
          author: metadata.author || null,
          description: metadata.description || null,
          cover_url: metadata.cover_url || null,
          file_path: filePath,
          type,
          uploader_id: user!.id,
          published_date: metadata.published_date || null,
        })
        .select()
        .single()

      if (insertError) {
        // 元数据写入失败时，清理已上传的文件
        await supabase.storage.from('books').remove([filePath])
        throw new Error(`书籍信息保存失败: ${insertError.message}`)
      }

      const newBook = data as Book

      // 更新本地状态，将新书籍插入列表头部
      setBooks((prev) => [newBook, ...prev])

      return newBook
    },
    [type]
  )

  /**
   * 更新书籍信息
   */
  const updateBook = useCallback(
    async (id: string, data: Partial<BookMetadata>): Promise<void> => {
      console.log('[useBooks] updateBook called:', { id, data })
      
      const { error: updateError } = await supabase
        .from('books')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) {
        console.error('[useBooks] Update error:', updateError)
        throw new Error(`书籍信息更新失败: ${updateError.message}`)
      }

      console.log('[useBooks] Update successful')

      // 更新本地状态
      setBooks((prev) =>
        prev.map((book) =>
          book.id === id
            ? { ...book, ...data, updated_at: new Date().toISOString() }
            : book
        )
      )
    },
    []
  )

  /**
   * 删除书籍
   * 1. 从 books 表删除记录（RLS 校验权限）
   * 2. 从 Supabase Storage 删除对应的 PDF 文件
   */
  const deleteBook = useCallback(
    async (id: string): Promise<void> => {
      // 先获取书籍信息以获取 file_path
      const bookToDelete = books.find((b) => b.id === id)

      const { error: deleteError } = await supabase
        .from('books')
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw new Error(`书籍删除失败: ${deleteError.message}`)
      }

      // 删除 Storage 中的文件（仅当无其他书籍引用同一文件时）
      if (bookToDelete?.file_path) {
        const { count } = await supabase
          .from('books')
          .select('id', { count: 'exact', head: true })
          .eq('file_path', bookToDelete.file_path)

        if (count === 0) {
          await supabase.storage
            .from('books')
            .remove([bookToDelete.file_path])
        }
      }

      // 更新本地状态
      setBooks((prev) => prev.filter((book) => book.id !== id))
    },
    [supabase, books]
  )


  /**
   * 重新排序书籍
   * 批量更新书籍的 sort_order 字段
   */
  const reorderBooks = useCallback(
    async (bookIds: string[]): Promise<void> => {
      // 批量更新 sort_order
      const updates = bookIds.map((id, index) => ({
        id,
        sort_order: index,
      }))

      for (const update of updates) {
        await supabase
          .from('books')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
      }

      // 更新本地状态
      setBooks((prev) => {
        const bookMap = new Map(prev.map((b) => [b.id, b]))
        return bookIds
          .map((id) => bookMap.get(id))
          .filter((b): b is Book => b !== undefined)
      })
    },
    []
  )
  return {
    books,
    loading,
    error,
    searchBooks,
    uploadBook,
    updateBook,
    deleteBook,
    reorderBooks,
  }
}


