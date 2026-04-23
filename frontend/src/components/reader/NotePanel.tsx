'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Plus,
  Trash,
  PencilSimple,
  Check,
  NotePencil,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import type { Annotation } from '@/types/database'

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
  onClose?: () => void
  embedded?: boolean
}

export function NotePanel({
  notes,
  currentPage,
  canAnnotate,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onClose,
  embedded,
}: NotePanelProps) {
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [filterPage, setFilterPage] = useState<number | null>(null)

  const filteredNotes = useMemo(() => {
    let list = notes
    if (filterPage !== null) list = list.filter((n) => n.page_number === filterPage)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((n) => n.content?.toLowerCase().includes(q))
    }
    return list
  }, [notes, filterPage, search])

  // 所有笔记涉及的页码
  const pages = useMemo(() => {
    const set = new Set(notes.map((n) => n.page_number ?? 0).filter(Boolean))
    return [...set].sort((a, b) => a - b)
  }, [notes])

  const hasActiveFilter = filterPage !== null || search.trim() !== ''

  // 按页码分组
  const grouped = useMemo(() => {
    const map = new Map<number, Annotation[]>()
    for (const n of filteredNotes) {
      const page = n.page_number ?? 0
      if (!map.has(page)) map.set(page, [])
      map.get(page)!.push(n)
    }
    return [...map.entries()].sort(([a], [b]) => a - b)
  }, [filteredNotes])

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

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editContent.trim()) return
    await onUpdateNote(editingId, editContent)
    setEditingId(null)
    setEditContent('')
  }, [editingId, editContent, onUpdateNote])

  return (
    <div
      className={embedded ? 'flex h-full flex-col overflow-hidden' :
        `shrink-0 border-l border-zinc-700/50 bg-zinc-900 overflow-hidden
        w-full sm:w-auto absolute sm:relative inset-0 sm:inset-auto z-30 sm:z-auto`}
    >
      <div className={embedded ? 'flex h-full flex-col' : 'flex h-full w-full sm:w-[320px] flex-col'}>
        {/* 头部 */}
        <div className="shrink-0 border-b border-zinc-700/50 px-3 py-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-300">
              笔记 {hasActiveFilter ? `(${filteredNotes.length}/${notes.length})` : `(${notes.length})`}
            </span>
            {!embedded && onClose && (
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-md
                text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800
                transition-colors active:scale-[0.98]"
              aria-label="关闭笔记面板"
            >
              <X size={14} weight="bold" />
            </button>
            )}
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索笔记..."
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 py-1.5 pl-7 pr-2
                text-xs text-zinc-200 placeholder:text-zinc-600 outline-none
                focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          {/* 页码筛选 */}
          {pages.length > 1 && (
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setFilterPage(null)}
                className={`rounded-md px-2 py-0.5 text-[10px] transition-colors
                  ${!filterPage ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
              >
                全部
              </button>
              <button
                onClick={() => setFilterPage(filterPage === currentPage ? null : currentPage)}
                className={`rounded-md px-2 py-0.5 text-[10px] transition-colors
                  ${filterPage === currentPage ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
              >
                当前页
              </button>
              {hasActiveFilter && (
                <button
                  onClick={() => { setFilterPage(null); setSearch('') }}
                  className="text-[10px] text-[var(--color-accent)] hover:underline ml-auto"
                >
                  清除
                </button>
              )}
            </div>
          )}
        </div>

        {/* 笔记列表（按页码分组） */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredNotes.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <NotePencil size={28} weight="duotone" className="text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-500">
                  {hasActiveFilter ? '没有匹配的笔记' : canAnnotate ? '暂无笔记，在下方添加' : '暂无笔记'}
                </p>
              </motion.div>
            )}

            {grouped.map(([page, items]) => (
              <div key={page}>
                <div className="text-[10px] text-zinc-500 font-medium px-1 mb-1">
                  第 {page} 页
                </div>
                <div className="space-y-1.5">
                  {items.map((note) => (
                    <motion.div
                      key={note.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={springTransition}
                      className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-2.5 group"
                    >
                      {editingId === note.id ? (
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
                              onClick={() => { setEditingId(null); setEditContent('') }}
                              className="rounded-md px-2.5 py-1 text-xs text-zinc-400
                                hover:text-zinc-200 hover:bg-zinc-700 transition-colors active:scale-[0.98]"
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
                        <div>
                          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {note.content}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {(note as any).profiles?.nickname && (
                                <span className="text-[10px] text-zinc-400 font-medium">
                                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                  {(note as any).profiles.nickname}
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-600">
                                {new Date(note.created_at).toLocaleString('zh-CN', {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                })}
                              </span>
                            </div>
                            {canAnnotate && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => { setEditingId(note.id); setEditContent(note.content || '') }}
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
                </div>
              </div>
            ))}
          </AnimatePresence>
        </div>

        {/* 添加笔记输入区 */}
        {canAnnotate && (
          <div className="shrink-0 border-t border-zinc-700/50 p-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">添加到第 {currentPage} 页</span>
              </div>
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="添加笔记..."
                className="w-full resize-none rounded-lg bg-zinc-800 border border-zinc-700
                  text-xs text-zinc-200 p-2.5 placeholder:text-zinc-600
                  outline-none focus:border-[var(--color-accent)] transition-colors"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd()
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-600">Ctrl+Enter 快速添加</span>
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
    </div>
  )
}
