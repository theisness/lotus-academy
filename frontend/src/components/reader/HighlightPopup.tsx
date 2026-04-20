'use client'

import { useState, useCallback } from 'react'
import { Trash, ChatText, Check, X } from '@phosphor-icons/react'

/**
 * HighlightPopup — 高亮悬停弹出菜单
 *
 * 当用户悬停在高亮上时显示，提供：
 * - 查看/编辑备注内容
 * - 删除高亮
 */

interface HighlightPopupProps {
  highlight: {
    id: string
    color: string
    comment: string
  }
  onDelete: () => void
  onUpdateComment: (comment: string) => void
}

export function HighlightPopup({
  highlight,
  onDelete,
  onUpdateComment,
}: HighlightPopupProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [commentDraft, setCommentDraft] = useState(highlight.comment || '')

  const handleSave = useCallback(() => {
    onUpdateComment(commentDraft)
    setIsEditing(false)
  }, [commentDraft, onUpdateComment])

  const handleCancel = useCallback(() => {
    setCommentDraft(highlight.comment || '')
    setIsEditing(false)
  }, [highlight.comment])

  return (
    <div
      className="rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl
        min-w-[180px] max-w-[280px] overflow-hidden"
    >
      {isEditing ? (
        /* 编辑备注模式 */
        <div className="p-2.5">
          <textarea
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder="添加备注..."
            className="w-full resize-none rounded-md bg-zinc-900 border border-zinc-600
              text-xs text-zinc-200 p-2 outline-none
              focus:border-[var(--color-accent)] transition-colors
              placeholder:text-zinc-600"
            rows={2}
            autoFocus
          />
          <div className="flex justify-end gap-1 mt-1.5">
            <button
              onClick={handleCancel}
              className="flex h-6 w-6 items-center justify-center rounded-md
                text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700
                transition-colors active:scale-[0.98]"
              aria-label="取消"
            >
              <X size={12} weight="bold" />
            </button>
            <button
              onClick={handleSave}
              className="flex h-6 w-6 items-center justify-center rounded-md
                bg-[var(--color-accent)] text-white
                hover:bg-[var(--color-accent-hover)]
                transition-colors active:scale-[0.98]"
              aria-label="保存备注"
            >
              <Check size={12} weight="bold" />
            </button>
          </div>
        </div>
      ) : (
        /* 查看模式 */
        <div>
          {/* 备注内容（如果有） */}
          {highlight.comment && (
            <div className="px-3 py-2 border-b border-zinc-700/50">
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {highlight.comment}
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-0.5 p-1">
            <button
              onClick={() => setIsEditing(true)}
              className="flex h-7 items-center gap-1.5 rounded-md px-2
                text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700
                transition-colors active:scale-[0.98]"
              aria-label="编辑备注"
            >
              <ChatText size={14} weight="regular" />
              <span>{highlight.comment ? '编辑备注' : '添加备注'}</span>
            </button>
            <button
              onClick={onDelete}
              className="flex h-7 items-center gap-1.5 rounded-md px-2
                text-xs text-zinc-400 hover:text-red-400 hover:bg-zinc-700
                transition-colors active:scale-[0.98]"
              aria-label="删除高亮"
            >
              <Trash size={14} weight="regular" />
              <span>删除</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
