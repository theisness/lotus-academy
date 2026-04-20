'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SquaresFour } from '@phosphor-icons/react'

interface DisplaySettingsProps {
  columns: number
  onChange: (columns: number) => void
}

const COLUMN_OPTIONS = [3, 4, 5, 6]

/**
 * DisplaySettings — 每行显示数量调整弹出菜单
 *
 * 点击网格图标弹出下拉菜单，选择每行列数。
 * 点击外部自动关闭。
 */
export function DisplaySettings({ columns, onChange }: DisplaySettingsProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Click outside to close
  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleSelect = useCallback(
    (value: number) => {
      onChange(value)
      setOpen(false)
    },
    [onChange]
  )

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 w-9 items-center justify-center rounded-lg
          border border-[var(--color-border)] bg-[var(--color-surface)]
          text-[var(--color-text-muted)] hover:text-[var(--color-text)]
          hover:border-[var(--color-accent)] transition-colors active:scale-[0.98]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        aria-label="调整显示列数"
        aria-expanded={open}
      >
        <SquaresFour size={18} weight="regular" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute right-0 top-full mt-2 z-20
              rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]
              shadow-lg py-1 min-w-[120px]"
            role="menu"
          >
            <p className="px-3 py-1.5 text-xs text-[var(--color-text-subtle)]">
              每行显示
            </p>
            {COLUMN_OPTIONS.map((opt) => (
              <button
                key={opt}
                role="menuitem"
                onClick={() => handleSelect(opt)}
                className={`w-full px-3 py-1.5 text-left text-sm transition-colors active:scale-[0.98]
                  ${
                    opt === columns
                      ? 'text-[var(--color-accent)] bg-[var(--color-accent-muted)]'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-border-subtle)]'
                  }`}
              >
                {opt} 列
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
