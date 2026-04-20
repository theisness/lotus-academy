'use client'

import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpenText, X } from '@phosphor-icons/react'

/**
 * AboutDialog — 关于弹窗
 *
 * 展示莲花书院品牌标识（Logo）和标语，
 * 包含网站简介、版本信息。
 * 采用 Glassmorphism 面板效果，与整体高端设计风格一致。
 * 从用户头像菜单的"关于"按钮触发。
 */

interface AboutDialogProps {
  open: boolean
  onClose: () => void
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const panelVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15 },
  },
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  /** ESC 键关闭 */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    // 阻止背景滚动
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.2 }}
        >
          {/* 背景遮罩 */}
          <motion.div
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* 弹窗面板 — Glassmorphism */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="关于莲花书院"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-sm overflow-hidden rounded-2xl
              bg-[var(--color-surface)]/80 backdrop-blur-xl
              border border-white/10
              shadow-[0_20px_60px_-12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]"
          >
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center
                rounded-lg text-[var(--color-text-subtle)]
                hover:text-[var(--color-text-muted)] hover:bg-[var(--color-border-subtle)]
                transition-colors active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              aria-label="关闭"
            >
              <X size={16} weight="bold" />
            </button>

            {/* 内容区域 */}
            <div className="flex flex-col items-center px-8 pt-10 pb-8">
              {/* Logo 图标 */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 100,
                  damping: 20,
                  delay: 0.1,
                }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl
                  bg-[var(--color-accent-muted)] shadow-sm"
              >
                <BookOpenText
                  size={32}
                  weight="duotone"
                  className="text-[var(--color-accent)]"
                />
              </motion.div>

              {/* 品牌名称 */}
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 100,
                  damping: 20,
                  delay: 0.15,
                }}
                className="mt-5 text-xl font-semibold tracking-tight text-[var(--color-text)]"
              >
                莲花书院
              </motion.h2>

              {/* 标语 */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 100,
                  damping: 20,
                  delay: 0.2,
                }}
                className="mt-1.5 text-sm text-[var(--color-text-muted)]"
              >
                阅读 · 批注 · 分享
              </motion.p>

              {/* 分隔线 */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 100,
                  damping: 20,
                  delay: 0.25,
                }}
                className="mt-6 h-px w-full bg-[var(--color-border-subtle)]"
              />

              {/* 简介 */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 100,
                  damping: 20,
                  delay: 0.3,
                }}
                className="mt-6 text-center text-sm leading-relaxed text-[var(--color-text-muted)] max-w-[28ch]"
              >
                一个全中文的书城社区，提供公共书籍浏览、个人书架管理、在线阅读与批注功能。
              </motion.p>

              {/* 版本信息 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="mt-6 flex items-center gap-2 rounded-lg
                  bg-[var(--color-bg)] px-3 py-1.5"
              >
                <span className="text-xs text-[var(--color-text-subtle)]">
                  版本
                </span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">
                  0.1.0
                </span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
