'use client'

import { motion } from 'framer-motion'
import { BookOpen, PencilSimple } from '@phosphor-icons/react'
import type { BookGridProps } from '@/types/components'
import type { Book } from '@/types/database'

/**
 * BookGrid — 书籍封面缩略图网格
 *
 * CSS Grid 布局，响应式断点适配。
 * 使用 staggerChildren 实现网格项入场动画。
 * 包含骨架屏加载状态、空状态。
 * 支持可选的编辑按钮（hover 时显示在封面右上角）。
 */

const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
}

/** Responsive grid class based on column count */
function getGridClass(columns: number): string {
  // Mobile (< 768px): single column, forced w-full
  // md: 3 cols, lg+: user-chosen column count
  const lgMap: Record<number, string> = {
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  }
  return `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${lgMap[columns] ?? 'lg:grid-cols-4'} gap-4 sm:gap-5`
}

/** Skeleton loading state */
function BookGridSkeleton({ columns }: { columns: number }) {
  const count = columns * 2 // Show 2 rows of skeletons
  return (
    <div className={getGridClass(columns)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] rounded-lg bg-[var(--color-border-subtle)]" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-3/4 rounded bg-[var(--color-border-subtle)]" />
            <div className="h-3 w-1/2 rounded bg-[var(--color-border-subtle)]" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Empty state */
function BookGridEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-border-subtle)]">
        <BookOpen size={32} weight="duotone" className="text-[var(--color-text-subtle)]" />
      </div>
      <h3 className="text-base font-medium text-[var(--color-text)]">
        暂无书籍
      </h3>
      <p className="mt-1 text-sm text-[var(--color-text-muted)] max-w-[30ch]">
        当前分类下还没有书籍，换个分类看看吧
      </p>
    </div>
  )
}

/** 根据字符串生成稳定的柔和色调 */
function titleToHue(title: string): number {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

/** 文字封面：根据标题生成带颜色的封面 */
function TextCover({ title, author }: { title: string; author?: string | null }) {
  const hue = titleToHue(title)
  // 柔和的渐变背景
  const bg = `linear-gradient(135deg, hsl(${hue}, 35%, 88%) 0%, hsl(${(hue + 30) % 360}, 30%, 78%) 100%)`
  const accentColor = `hsl(${hue}, 40%, 35%)`

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-4 select-none"
      style={{ background: bg }}
    >
      {/* 装饰线 */}
      <div
        className="w-8 h-0.5 rounded-full mb-4 opacity-40"
        style={{ backgroundColor: accentColor }}
      />
      {/* 标题 */}
      <h4
        className="text-center font-semibold leading-snug line-clamp-4 px-2"
        style={{ color: accentColor, fontSize: title.length > 10 ? '0.8rem' : '0.9rem' }}
      >
        {title}
      </h4>
      {/* 作者 */}
      {author && (
        <p
          className="mt-2 text-center text-[0.65rem] leading-tight line-clamp-1 opacity-60 px-2"
          style={{ color: accentColor }}
        >
          {author}
        </p>
      )}
      {/* 装饰线 */}
      <div
        className="w-8 h-0.5 rounded-full mt-4 opacity-40"
        style={{ backgroundColor: accentColor }}
      />
    </div>
  )
}

/** Single book card */
function BookCard({
  book,
  onClick,
  onEditClick,
}: {
  book: Book
  onClick: (book: Book) => void
  onEditClick?: (book: Book) => void
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="group relative"
    >
      <button
        type="button"
        onClick={() => onClick(book)}
        className="w-full text-left transition-transform active:scale-[0.98]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-lg"
      >
        {/* Cover */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg
          border border-[var(--color-border-subtle)] bg-[var(--color-surface)]
          transition-shadow group-hover:shadow-md">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <TextCover title={book.title} author={book.author} />
          )}
        </div>

        {/* Info */}
        <div className="mt-2.5 px-0.5">
          <h3 className="text-sm font-medium text-[var(--color-text)] leading-snug line-clamp-2
            group-hover:text-[var(--color-accent)] transition-colors">
            {book.title}
          </h3>
          {book.author && (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)] line-clamp-1">
              {book.author}
            </p>
          )}
        </div>
      </button>

      {/* Edit button — appears on hover, top-right of cover */}
      {onEditClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEditClick(book)
          }}
          className="absolute top-2 right-2 z-10
            flex h-8 w-8 items-center justify-center rounded-lg
            bg-[var(--color-surface)]/80 backdrop-blur-sm
            border border-[var(--color-border)]
            text-[var(--color-text-muted)]
            opacity-0 group-hover:opacity-100
            transition-all duration-200
            hover:bg-[var(--color-surface)] hover:text-[var(--color-accent)]
            active:scale-[0.98]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          aria-label="编辑书籍信息"
        >
          <PencilSimple size={16} weight="bold" />
        </button>
      )}
    </motion.div>
  )
}

export function BookGrid({ books, columns, loading, onBookClick, onEditClick }: BookGridProps) {
  if (loading) {
    return <BookGridSkeleton columns={columns} />
  }

  if (books.length === 0) {
    return <BookGridEmpty />
  }

  return (
    <motion.div
      className={getGridClass(columns)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      key={books.map((b) => b.id).join(',')}
    >
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          onClick={onBookClick}
          onEditClick={onEditClick}
        />
      ))}
    </motion.div>
  )
}
