'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import type { SearchBarProps } from '@/types/components'

/**
 * SearchBar — 书籍搜索输入框
 *
 * 带搜索图标、300ms 防抖、清除按钮。
 */
export function SearchBar({ value, onChange, placeholder = '搜索书籍...' }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value
      setLocalValue(next)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onChange(next)
      }, 300)
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [onChange])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className="relative">
      <MagnifyingGlass
        size={18}
        weight="regular"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
      />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]
          py-2 pl-10 pr-9 text-sm text-[var(--color-text)]
          placeholder:text-[var(--color-text-subtle)]
          outline-none transition-colors
          focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30"
        aria-label={placeholder}
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2
            flex items-center justify-center rounded-full p-0.5
            text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)]
            transition-colors active:scale-[0.98]"
          aria-label="清除搜索"
        >
          <X size={14} weight="bold" />
        </button>
      )}
    </div>
  )
}
