'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  X,
  Trash,
  Check,
  Highlighter,
  ChatText,
  NavigationArrow,
  MagnifyingGlass,
  Funnel,
} from '@phosphor-icons/react'
import type { Annotation } from '@/types/database'

interface AnnotationPanelProps {
  annotations: Annotation[]
  canAnnotate: boolean
  onDelete: (id: string) => void
  onUpdateComment: (id: string, comment: string) => void
  onScrollTo: (id: string) => void
  onClose?: () => void
  embedded?: boolean
}

type FilterType = 'all' | 'with-comment' | 'no-comment'

export function AnnotationPanel({
  annotations,
  canAnnotate,
  onDelete,
  onUpdateComment,
  onScrollTo,
  onClose,
  embedded,
}: AnnotationPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterColor, setFilterColor] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const highlights = useMemo(() => {
    let list = annotations.filter((a) => a.type === 'highlight')

    if (filterType === 'with-comment') list = list.filter((a) => a.content)
    else if (filterType === 'no-comment') list = list.filter((a) => !a.content)

    if (filterColor) list = list.filter((a) => a.color === filterColor)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((a) => a.content?.toLowerCase().includes(q))
    }

    return list
  }, [annotations, filterType, filterColor, search])

  // 所有高亮中出现的颜色
  const colors = useMemo(() => {
    const set = new Set(annotations.filter((a) => a.type === 'highlight' && a.color).map((a) => a.color!))
    return [...set]
  }, [annotations])

  // 按页码分组
  const grouped = useMemo(() => {
    const map = new Map<number, Annotation[]>()
    for (const h of highlights) {
      const page = h.page_number ?? 0
      if (!map.has(page)) map.set(page, [])
      map.get(page)!.push(h)
    }
    return [...map.entries()].sort(([a], [b]) => a - b)
  }, [highlights])

  const totalHighlights = annotations.filter((a) => a.type === 'highlight').length
  const hasActiveFilter = filterType !== 'all' || filterColor !== null || search.trim() !== ''

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return
    onUpdateComment(editingId, editContent)
    setEditingId(null)
    setEditContent('')
  }, [editingId, editContent, onUpdateComment])

  return (
    <div className={embedded ? 'flex h-full flex-col overflow-hidden' :
      `shrink-0 border-l border-zinc-700/50 bg-zinc-900 overflow-hidden
      w-full sm:w-auto absolute sm:relative inset-0 sm:inset-auto z-30 sm:z-auto`}>
      <div className={embedded ? 'flex h-full flex-col' : 'flex h-full w-full sm:w-[320px] flex-col'}>
        {/* 头部 */}
        <div className="shrink-0 border-b border-zinc-700/50 px-3 py-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-300">
              高亮批注 {hasActiveFilter ? `(${highlights.length}/${totalHighlights})` : `(${totalHighlights})`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors active:scale-[0.98]
                  ${showFilters || hasActiveFilter ? 'text-[var(--color-accent)] bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                aria-label="筛选"
              >
                <Funnel size={13} weight={hasActiveFilter ? 'fill' : 'regular'} />
              </button>
              {!embedded && onClose && (
              <button
                onClick={onClose}
                className="flex h-6 w-6 items-center justify-center rounded-md
                  text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors active:scale-[0.98]"
                aria-label="关闭"
              >
                <X size={14} weight="bold" />
              </button>
              )}
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索备注内容..."
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 py-1.5 pl-7 pr-2
                text-xs text-zinc-200 placeholder:text-zinc-600 outline-none
                focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          {/* 筛选条件 */}
          {showFilters && (
            <div className="space-y-2 pt-1">
              {/* 按备注筛选 */}
              <div className="flex items-center gap-1">
                {(['all', 'with-comment', 'no-comment'] as FilterType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`rounded-md px-2 py-1 text-[10px] transition-colors
                      ${filterType === t
                        ? 'bg-zinc-700 text-zinc-200'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                  >
                    {t === 'all' ? '全部' : t === 'with-comment' ? '有备注' : '无备注'}
                  </button>
                ))}
              </div>

              {/* 按颜色筛选 */}
              {colors.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500">颜色:</span>
                  <button
                    onClick={() => setFilterColor(null)}
                    className={`rounded-md px-1.5 py-0.5 text-[10px] transition-colors
                      ${!filterColor ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    全部
                  </button>
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setFilterColor(filterColor === c ? null : c)}
                      className={`h-4 w-4 rounded-full border-2 transition-colors
                        ${filterColor === c ? 'border-white' : 'border-transparent hover:border-zinc-500'}`}
                      style={{ backgroundColor: c }}
                      aria-label={`筛选颜色`}
                    />
                  ))}
                </div>
              )}

              {hasActiveFilter && (
                <button
                  onClick={() => { setFilterType('all'); setFilterColor(null); setSearch('') }}
                  className="text-[10px] text-[var(--color-accent)] hover:underline"
                >
                  清除筛选
                </button>
              )}
            </div>
          )}
        </div>

        {/* 列表（按页码分组） */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {highlights.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Highlighter size={28} weight="duotone" className="text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-500">
                {hasActiveFilter ? '没有匹配的批注' : '暂无高亮批注'}
              </p>
            </div>
          )}

          {grouped.map(([page, items]) => (
            <div key={page}>
              <div className="text-[10px] text-zinc-500 font-medium px-1 mb-1">
                第 {page} 页
              </div>
              <div className="space-y-1.5">
                {items.map((ann) => (
                  <div
                    key={ann.id}
                    className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-2.5 group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: ann.color || 'rgba(255,226,143,0.6)' }}
                      />
                      <span className="text-[10px] text-zinc-600">
                        {new Date(ann.created_at).toLocaleString('zh-CN', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      <button
                        onClick={() => onScrollTo(ann.id)}
                        className="ml-auto flex h-5 w-5 items-center justify-center rounded
                          text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700
                          opacity-0 group-hover:opacity-100 transition-all active:scale-[0.98]"
                        aria-label="跳转"
                      >
                        <NavigationArrow size={11} weight="bold" />
                      </button>
                    </div>

                    {editingId === ann.id ? (
                      <div className="flex flex-col gap-1.5">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          placeholder="添加备注..."
                          className="w-full resize-none rounded-md bg-zinc-900 border border-zinc-600
                            text-xs text-zinc-200 p-2 outline-none
                            focus:border-[var(--color-accent)] transition-colors"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => { setEditingId(null); setEditContent('') }}
                            className="rounded-md px-2 py-0.5 text-[10px] text-zinc-400
                              hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                          >
                            取消
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="inline-flex items-center gap-0.5 rounded-md
                              bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-medium text-white
                              hover:bg-[var(--color-accent-hover)] transition-colors"
                          >
                            <Check size={10} weight="bold" />
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {ann.content && (
                          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap mb-1">
                            {ann.content}
                          </p>
                        )}
                        {canAnnotate && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingId(ann.id); setEditContent(ann.content || '') }}
                              className="flex h-6 items-center gap-1 rounded-md px-1.5
                                text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700
                                transition-colors active:scale-[0.98]"
                            >
                              <ChatText size={12} />
                              <span>{ann.content ? '编辑' : '备注'}</span>
                            </button>
                            <button
                              onClick={() => onDelete(ann.id)}
                              className="flex h-6 items-center gap-1 rounded-md px-1.5
                                text-[10px] text-zinc-500 hover:text-red-400 hover:bg-zinc-700
                                transition-colors active:scale-[0.98]"
                            >
                              <Trash size={12} />
                              <span>删除</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
