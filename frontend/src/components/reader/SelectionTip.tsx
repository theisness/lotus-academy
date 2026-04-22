'use client'

import { Highlighter, X } from '@phosphor-icons/react'

/**
 * SelectionTip — 文本选中后的提示气泡
 *
 * 当用户选中文本时，在选区上方显示高亮按钮，
 * 点击按钮才创建高亮。
 */

interface SelectionTipProps {
  activeColor: string
  onHighlight: () => void
  onCancel: () => void
}

export function SelectionTip({ activeColor, onHighlight, onCancel }: SelectionTipProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg
        bg-zinc-800 border border-zinc-700 px-2 py-1.5
        shadow-xl text-xs text-zinc-300 select-none"
    >
      <button
        onClick={onHighlight}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md
          bg-zinc-700/50 hover:bg-zinc-700 transition-colors"
      >
        <div
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: activeColor }}
        />
        <Highlighter size={14} weight="regular" className="text-zinc-400" />
        <span>高亮</span>
      </button>
      <button
        onClick={onCancel}
        className="p-1 rounded-md hover:bg-zinc-700 transition-colors"
      >
        <X size={14} weight="bold" className="text-zinc-400" />
      </button>
    </div>
  )
}