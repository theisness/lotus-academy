'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  SpinnerGap,
  WarningCircle,
  ArrowClockwise,
} from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthContext } from '@/components/providers/AuthProvider'
import type { Book } from '@/types/database'
import { PdfReader } from './PdfReader'

/**
 * ReaderClient — 阅读器主客户端组件
 *
 * 负责：
 * 1. 根据 bookId 从数据库加载书籍信息
 * 2. 生成 Supabase Storage 的 PDF 文件签名 URL
 * 3. 判断当前用户的批注权限（canAnnotate）
 * 4. 渲染 PdfReader 组件
 */

const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

interface ReaderClientProps {
  bookId: string
}

export function ReaderClient({ bookId }: ReaderClientProps) {
  const router = useRouter()
  const { user, isAdmin, loading: authLoading } = useAuthContext()
  const supabase = createClient()

  const [book, setBook] = useState<Book | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * 加载书籍信息并生成 PDF 文件签名 URL
   */
  const loadBook = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 获取书籍元数据
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single()

      if (bookError || !bookData) {
        throw new Error('书籍不存在或无权访问')
      }

      const bookRecord = bookData as Book
      setBook(bookRecord)

      // 生成 Supabase Storage 签名 URL（有效期 1 小时）
      const { data: signedData, error: signedError } = await supabase.storage
        .from('books')
        .createSignedUrl(bookRecord.file_path, 3600)

      if (signedError || !signedData?.signedUrl) {
        throw new Error('无法获取 PDF 文件链接')
      }

      setFileUrl(signedData.signedUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [supabase, bookId])

  useEffect(() => {
    if (!authLoading) {
      loadBook()
    }
  }, [loadBook, authLoading])

  /**
   * 判断当前用户是否可以批注
   * - 管理员打开公共书籍：可以
   * - 用户打开自己的私有书籍：可以
   * - 其他情况：不可以
   */
  const canAnnotate = (() => {
    if (!book || !user) return false
    if (book.type === 'public') return isAdmin
    if (book.type === 'private') return book.uploader_id === user.id
    return false
  })()

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  // 加载中状态
  if (loading || authLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springTransition}
          className="flex flex-col items-center gap-4"
        >
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="inline-flex text-[var(--color-accent)]"
          >
            <SpinnerGap size={32} />
          </motion.span>
          <p className="text-sm text-[var(--color-text-muted)]">
            正在加载书籍...
          </p>
        </motion.div>
      </div>
    )
  }

  // 错误状态
  if (error || !book || !fileUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="flex flex-col items-center gap-4 text-center px-4"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-error-muted)]">
            <WarningCircle
              size={28}
              weight="duotone"
              className="text-[var(--color-error)]"
            />
          </div>
          <h3 className="text-base font-medium text-[var(--color-text)]">
            加载失败
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] max-w-[36ch]">
            {error || '无法加载书籍内容'}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-lg
                border border-[var(--color-border)] bg-[var(--color-surface)]
                px-4 py-2 text-sm font-medium text-[var(--color-text)]
                hover:border-[var(--color-accent)] transition-colors active:scale-[0.98]"
            >
              <ArrowLeft size={16} weight="regular" />
              返回书架
            </button>
            <button
              onClick={loadBook}
              className="inline-flex items-center gap-2 rounded-lg
                bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white
                hover:bg-[var(--color-accent-hover)] transition-colors active:scale-[0.98]"
            >
              <ArrowClockwise size={16} weight="regular" />
              重试
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <PdfReader
      bookId={bookId}
      fileUrl={fileUrl}
      canAnnotate={canAnnotate}
      bookTitle={book.title}
      onBack={handleBack}
    />
  )
}
