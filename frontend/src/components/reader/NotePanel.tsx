'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Plus,
  Trash,
  PencilSimple,
  Check,
  NotePencil,
} from '@phosphor-icons/react'
import type { Annotation } from '@/types/database'

/**
 * NotePanel — 笔记面板
 *
 * 展示当前页面的所有笔记，支持：
 * - 添加新笔记
 * - 编辑已有笔记
 * - 删除笔记
 * 仅在 canAnnotate 为 true 时允许编辑操作。
 */

const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

interface NotePanelProps {
  notes: Annotation[]
  currentPage: number
  canAnnotate: boolean
  onAddNote: (content: string) => Promise<void>
  onUpdateNote: (noteId: string, content: string) => Promise<void>
  onDeleteNote: (noteId: string) => Promise<void>
  onClose: () => void
}

export function NotePanel({
  notes,
  currentPage,
  canAnnotate,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onClose,
}: NotePanelProps) {
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = useCallback(async () => {
    if (!newNoteContent.trim()) return
    setIsAdding(true)
    try {
      await onAddNote(newNoteContent)
      setNewNoteContent('')
    } finally {
      setIsAdding(false)
    }
  }, [newNoteContent, onAddNote])

  const handleStartEdit = useCallback((note: Annotation) => {
    setEditingId(note.id)
    setEditContent(note.content || '')
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editContent.trim()) return
    await onUpdateNote(editingId, editContent)
    setEditingId(null)
    setEditContent('')
  }, [editingId, editContent, onUpdateNote])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditContent('')
  }, [])

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 'auto', opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={springTransition}
      className="shrink-0 border-l border-zinc-700/50 bg-zinc-900 overflow-hidden
        w-full sm:w-auto absolute sm:relative inset-0 sm:inset-auto z-30 sm:z-auto"
    >
      <div className="flex h-full w-full sm:w-[320px] flex-col">
        {/* 面板头部 */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-700/50 px-3">
          <span className="text-xs font-medium text-zinc-300">
            第 {currentPage} 页笔记
          </span>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md
              text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800
              transition-colors active:scale-[0.98]"
            aria-label="关闭笔记面板"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* 笔记列表 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <AnimatePresence mode="popLayout">
            {notes.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <NotePencil
                  size={28}
                  weight="duotone"
                  className="text-zinc-600 mb-2"
                />
                <p className="text-xs text-zinc-500">
                  {canAnnotate
                    ? '暂无笔记，在下方添加'
                    : '当前页面暂无笔记'}
                </p>
              </motion.div>
            )}

            {notes.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={springTransition}
                className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-3"
              >
                {editingId === note.id ? (
                  /* 编辑模式 */
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full resize-none rounded-md bg-zinc-800 border border-zinc-600
                        text-xs text-zinc-200 p-2 outline-none
                        focus:border-[var(--color-accent)] transition-colors"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={handleCancelEdit}
                        className="rounded-md px-2.5 py-1 text-xs text-zinc-400
                          hover:text-zinc-200 hover:bg-zinc-700
                          transition-colors active:scale-[0.98]"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editContent.trim()}
                        className="inline-flex items-center gap-1 rounded-md
                          bg-[var(--color-accent)] px-2.5 py-1 text-xs font-medium text-white
                          hover:bg-[var(--color-accent-hover)]
                          disabled:opacity-50 disabled:cursor-not-allowed
                          transition-colors active:scale-[0.98]"
                      >
                        <Check size={12} weight="bold" />
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 查看模式 */
                  <div>
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-600">
                        {new Date(note.created_at).toLocaleString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {canAnnotate && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(note)}
                            className="flex h-6 w-6 items-center justify-center rounded-md
                              text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700
                              transition-colors active:scale-[0.98]"
                            aria-label="编辑笔记"
                          >
                            <PencilSimple size={12} weight="regular" />
                          </button>
                          <button
                            onClick={() => onDeleteNote(note.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-md
                              text-zinc-500 hover:text-red-400 hover:bg-zinc-700
                              transition-colors active:scale-[0.98]"
                            aria-label="删除笔记"
                          >
                            <Trash size={12} weight="regular" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* 添加笔记输入区（仅 canAnnotate 时显示） */}
        {canAnnotate && (
          <div className="shrink-0 border-t border-zinc-700/50 p-3">
            <div className="flex flex-col gap-2">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="添加笔记..."
                className="w-full resize-none rounded-lg bg-zinc-800 border border-zinc-700
                  text-xs text-zinc-200 p-2.5 placeholder:text-zinc-600
                  outline-none focus:border-[var(--color-accent)]
                  transition-colors"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleAdd()
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-600">
                  Ctrl+Enter 快速添加
                </span>
                <button
                  onClick={handleAdd}
                  disabled={!newNoteContent.trim() || isAdding}
                  className="inline-flex items-center gap-1 rounded-md
                    bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white
                    hover:bg-[var(--color-accent-hover)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors active:scale-[0.98]"
                >
                  <Plus size={12} weight="bold" />
                  添加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
