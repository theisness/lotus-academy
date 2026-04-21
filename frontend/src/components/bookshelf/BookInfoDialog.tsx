'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, User, FileText, Clock } from '@phosphor-icons/react'
import type { Book } from '@/types/database'

/**
 * BookInfoDialog — 书籍信息查看弹窗
 *
 * 显示书籍的详细信息：标题、作者、发布日期、描述、上传时间等。
 * 用于非管理员用户查看公共书籍详情。
 */

const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

interface BookInfoDialogProps {
  book: Book
  open: boolean
  onClose: () => void
}

/** 格式化日期 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '未知'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

export function BookInfoDialog({ book, open, onClose }: BookInfoDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Glassmorphism backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />

          {/* Dialog panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={springTransition}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-md rounded-2xl
              border border-[var(--color-border)]
              bg-[var(--color-surface)]
              shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)]
              overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
                书籍详情
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--color-text-subtle)]
                  hover:text-[var(--color-text-muted)] hover:bg-[var(--color-border-subtle)]
                  transition-colors active:scale-[0.98]"
                aria-label="关闭"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Title */}
              <div>
                <h3 className="text-xl font-semibold text-[var(--color-text)] leading-snug">
                  {book.title}
                </h3>
              </div>

              {/* Author */}
              {book.author && (
                <div className="flex items-start gap-3">
                  <User size={18} weight="duotone" className="text-[var(--color-accent)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--color-text-subtle)] mb-0.5">作者</p>
                    <p className="text-sm text-[var(--color-text)]">{book.author}</p>
                  </div>
                </div>
              )}

              {/* Published Date */}
              {book.published_date && (
                <div className="flex items-start gap-3">
                  <Calendar size={18} weight="duotone" className="text-[var(--color-accent)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--color-text-subtle)] mb-0.5">发布日期</p>
                    <p className="text-sm text-[var(--color-text)]">{formatDate(book.published_date)}</p>
                  </div>
                </div>
              )}

              {/* Upload Date */}
              <div className="flex items-start gap-3">
                <Clock size={18} weight="duotone" className="text-[var(--color-accent)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-[var(--color-text-subtle)] mb-0.5">上传时间</p>
                  <p className="text-sm text-[var(--color-text)]">{formatDate(book.created_at)}</p>
                </div>
              </div>

              {/* Description */}
              {book.description && (
                <div className="flex items-start gap-3">
                  <FileText size={18} weight="duotone" className="text-[var(--color-accent)] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--color-text-subtle)] mb-0.5">描述</p>
                    <p className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
                      {book.description}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 pb-6 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[var(--color-border)]
                  bg-[var(--color-surface)] px-4 py-2 text-sm font-medium
                  text-[var(--color-text)] transition-colors
                  hover:border-[var(--color-text-subtle)]
                  active:scale-[0.98]"
              >
                关闭
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
