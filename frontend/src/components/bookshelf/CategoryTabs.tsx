'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { CategoryTabsProps } from '@/types/components'

/**
 * CategoryTabs — 栏目标签页切换
 *
 * 水平可滚动标签栏，使用 Framer Motion layoutId 实现
 * 活动指示器的平滑滑动动画（Spring 物理）。
 * 包含"全部"作为第一个标签（id: null）。
 */

const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

export function CategoryTabs({ categories, activeId, onSelect }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current
      const tab = activeRef.current
      const containerRect = container.getBoundingClientRect()
      const tabRect = tab.getBoundingClientRect()

      if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
        tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [activeId])

  const allTabs = [
    { id: null as string | null, name: '全部' },
    ...categories.map((c) => ({ id: c.id as string | null, name: c.name })),
  ]

  return (
    <div
      ref={scrollRef}
      className="flex gap-1 overflow-x-auto scrollbar-none pb-1"
      role="tablist"
      aria-label="书籍栏目"
    >
      {allTabs.map((tab) => {
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id ?? '__all__'}
            ref={isActive ? activeRef : undefined}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id as string)}
            className="relative shrink-0 rounded-lg px-4 py-2 text-sm font-medium
              transition-colors active:scale-[0.98]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            style={{
              color: isActive
                ? 'var(--color-text)'
                : 'var(--color-text-muted)',
            }}
          >
            {isActive && (
              <motion.span
                layoutId="category-tab-indicator"
                className="absolute inset-0 rounded-lg bg-[var(--color-surface)] shadow-sm border border-[var(--color-border-subtle)]"
                transition={springTransition}
                style={{ zIndex: 0 }}
              />
            )}
            <span className="relative z-10">{tab.name}</span>
          </button>
        )
      })}
    </div>
  )
}
