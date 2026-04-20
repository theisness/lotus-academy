'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  BookOpen,
  HighlighterCircle,
  PencilSimple,
  Checks,
} from '@phosphor-icons/react'
import { useMessages } from '@/hooks/useMessages'
import { useAuthContext } from '@/components/providers/AuthProvider'
import type { MessageWithDetails } from '@/types/common'
import type { MessageType } from '@/types/database'

/**
 * 消息类型对应的图标和颜色配置
 */
const MESSAGE_CONFIG: Record<
  MessageType,
  { icon: typeof BookOpen; label: string; color: string }
> = {
  book_upload: {
    icon: BookOpen,
    label: '新书上架',
    color: 'text-emerald-500',
  },
  annotation: {
    icon: HighlighterCircle,
    label: '新增批注',
    color: 'text-amber-500',
  },
  book_update: {
    icon: PencilSimple,
    label: '书籍更新',
    color: 'text-sky-500',
  },
}

/**
 * 格式化消息时间为相对时间
 */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 30) return `${days} 天前`

  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

/* ─────────────────────────────────────────────
 * NotificationBadge — 未读数量标记
 * 使用 Framer Motion overshoot spring 动效
 * ───────────────────────────────────────────── */

function NotificationBadge({ count }: { count: number }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key="badge"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 15,
          }}
          className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center
            justify-center rounded-full bg-[var(--color-error)] px-1
            text-[10px] font-semibold leading-none text-white"
        >
          {count > 99 ? '99+' : count}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

/* ─────────────────────────────────────────────
 * MessageItem — 单条消息组件
 * 批注通知支持点击跳转到阅读器对应页面
 * ───────────────────────────────────────────── */

function MessageItem({
  item,
  onMarkRead,
  onNavigate,
}: {
  item: MessageWithDetails
  onMarkRead: (id: string) => void
  onNavigate: (bookId: string, page?: number | null) => void
}) {
  const config = MESSAGE_CONFIG[item.message.type] || MESSAGE_CONFIG.book_update
  const Icon = config.icon

  const handleClick = () => {
    // 标记为已读
    if (!item.is_read) {
      onMarkRead(item.id)
    }

    // 批注通知或有关联书籍的消息支持跳转
    if (item.message.related_book_id) {
      onNavigate(
        item.message.related_book_id,
        item.message.related_page_number
      )
    }
  }

  const isClickable = !!item.message.related_book_id

  return (
    <motion.div
      layout
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
      }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={handleClick}
      className={`group flex gap-3 rounded-lg px-3 py-2.5 transition-colors
        ${isClickable ? 'cursor-pointer hover:bg-[var(--color-bg)]' : ''}
        ${!item.is_read ? 'bg-[var(--color-accent-muted)]/30' : ''}`}
    >
      {/* 消息类型图标 */}
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center
          rounded-full bg-[var(--color-bg)] ${config.color}`}
      >
        <Icon size={16} weight="duotone" />
      </div>

      {/* 消息内容 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm leading-snug
              ${!item.is_read ? 'font-medium text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}
          >
            {item.message.title}
          </p>
          {!item.is_read && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" />
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--color-text-subtle)]">
          {item.message.content}
        </p>
        <p className="mt-1 text-[11px] text-[var(--color-text-subtle)]">
          {formatRelativeTime(item.message.created_at)}
        </p>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
 * MessageBox — 消息盒子主组件
 * 集成到 Navbar，包含通知按钮 + 下拉消息列表
 * ───────────────────────────────────────────── */

export function MessageBox() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { user } = useAuthContext()
  const { messages, unreadCount, loading, markAsRead, markAllAsRead } =
    useMessages()

  /**
   * 点击外部关闭消息盒子
   */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  /**
   * 跳转到阅读器对应页面
   */
  const handleNavigate = (bookId: string, page?: number | null) => {
    setOpen(false)
    const url = page
      ? `/reader/${bookId}?page=${page}`
      : `/reader/${bookId}`
    router.push(url)
  }

  // 未登录时不渲染
  if (!user) return null

  return (
    <div ref={containerRef} className="relative">
      {/* 通知按钮 */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full
          text-[var(--color-text-muted)] hover:text-[var(--color-text)]
          hover:bg-[var(--color-bg)] transition-colors active:scale-[0.98]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        aria-label={`消息通知${unreadCount > 0 ? `，${unreadCount} 条未读` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={20} weight={open ? 'fill' : 'regular'} />
        <NotificationBadge count={unreadCount} />
      </button>

      {/* 消息下拉面板 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute right-0 top-full z-50 mt-2 w-[360px]
              rounded-xl border border-[var(--color-border-subtle)]
              bg-[var(--color-surface)] shadow-lg
              shadow-black/5"
          >
            {/* 面板头部 */}
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">
                消息通知
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-[var(--color-accent)]
                    hover:text-[var(--color-accent-hover)] transition-colors active:scale-[0.98]"
                >
                  <Checks size={14} weight="bold" />
                  全部已读
                </button>
              )}
            </div>

            {/* 消息列表 */}
            <div className="max-h-[400px] overflow-y-auto overscroll-contain">
              {loading ? (
                /* 骨架屏加载状态 */
                <div className="space-y-1 p-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 rounded-lg px-3 py-2.5">
                      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[var(--color-border-subtle)]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-3/4 animate-pulse rounded bg-[var(--color-border-subtle)]" />
                        <div className="h-3 w-full animate-pulse rounded bg-[var(--color-border-subtle)]" />
                        <div className="h-2.5 w-16 animate-pulse rounded bg-[var(--color-border-subtle)]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                /* 空状态 */
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell
                    size={40}
                    weight="thin"
                    className="text-[var(--color-text-subtle)]"
                  />
                  <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                    暂无消息通知
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                    管理员操作公共书籍时会产生通知
                  </p>
                </div>
              ) : (
                /* 消息列表 — staggerChildren 渐次入场 */
                <motion.div
                  className="space-y-0.5 p-1.5"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.05 } },
                  }}
                  initial="hidden"
                  animate="visible"
                >
                  <AnimatePresence mode="popLayout">
                    {messages.map((item) => (
                      <MessageItem
                        key={item.id}
                        item={item}
                        onMarkRead={markAsRead}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>

            {/* 面板底部：已读消息数量 */}
            {!loading && messages.length > 0 && (
              <div className="border-t border-[var(--color-border-subtle)] px-4 py-2.5">
                <p className="text-center text-[11px] text-[var(--color-text-subtle)]">
                  共 {messages.length} 条消息
                  {unreadCount > 0 && `，${unreadCount} 条未读`}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
