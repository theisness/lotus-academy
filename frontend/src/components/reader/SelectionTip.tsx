'use client'

import { Highlighter } from '@phosphor-icons/react'

/**
 * SelectionTip — 文本选中后的提示气泡
 *
 * 当用户选中文本时，在选区上方显示一个小提示，
 * 告知用户松开鼠标即可创建高亮。
 * 显示当前选中的高亮颜色。
 */

interface SelectionTipProps {
  activeColor: string
}

export function SelectionTip({ activeColor }: SelectionTipProps) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg
        bg-zinc-800 border border-zinc-700 px-2.5 py-1.5
        shadow-xl text-xs text-zinc-300 select-none"
    >
      <div
        className="h-3 w-3 rounded-full shrink-0"
        style={{ backgroundColor: activeColor }}
      />
      <Highlighter size={14} weight="regular" className="text-zinc-400" />
      <span>高亮选中文本</span>
    </div>
  )
}
