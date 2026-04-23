'use client'

import { useState } from 'react'
import { Highlighter, ChatText, X, Check } from '@phosphor-icons/react'

interface SelectionTipProps {
  activeColor: string
  canAnnotate: boolean
  canComment: boolean
  onHighlight: () => void
  onComment: (text: string) => void
  onCancel: () => void
}

export function SelectionTip({ activeColor, canAnnotate, canComment, onHighlight, onComment, onCancel }: SelectionTipProps) {
  const [commenting, setCommenting] = useState(false)
  const [commentText, setCommentText] = useState('')

  if (commenting) {
    return (
      <div className="rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl p-2 w-56">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="添加评论…"
          className="w-full resize-none rounded-md bg-zinc-900 border border-zinc-600
            text-xs text-zinc-200 p-2 outline-none focus:border-[var(--color-accent)]
            placeholder:text-zinc-600"
          rows={3}
          autoFocus
        />
        <div className="flex justify-end gap-1 mt-1.5">
          <button
            onClick={() => { setCommenting(false); setCommentText('') }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700"
          >
            <X size={12} weight="bold" />
          </button>
          <button
            onClick={() => { if (commentText.trim()) { onComment(commentText.trim()); setCommentText('') } }}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-accent)] text-white"
          >
            <Check size={12} weight="bold" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 shadow-xl text-xs text-zinc-300 select-none">
      {canAnnotate && (
        <button
          onClick={onHighlight}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-700/50 hover:bg-zinc-700 transition-colors"
        >
          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: activeColor }} />
          <Highlighter size={14} weight="regular" className="text-zinc-400" />
          <span>高亮</span>
        </button>
      )}
      {canComment && (
        <button
          onClick={() => setCommenting(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-700/50 hover:bg-zinc-700 transition-colors"
        >
          <ChatText size={14} weight="regular" className="text-zinc-400" />
          <span>评论</span>
        </button>
      )}
      <button onClick={onCancel} className="p-1 rounded-md hover:bg-zinc-700 transition-colors">
        <X size={14} weight="bold" className="text-zinc-400" />
      </button>
    </div>
  )
}
