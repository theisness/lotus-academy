'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MagnifyingGlass, SpinnerGap } from '@phosphor-icons/react'

export interface SearchResult {
  page: number
  text: string
  matchIdx: number
}

interface SearchPanelProps {
  results: SearchResult[]
  searching: boolean
  activeIndex: number
  query: string
  onSearch: (query: string) => void
  onJump: (index: number) => void
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-yellow-500/40 text-yellow-200 rounded-sm px-0.5">{part}</mark>
          : part
      )}
    </>
  )
}

export function SearchPanel({
  results,
  searching,
  activeIndex,
  query: searchQuery,
  onSearch,
  onJump,
}: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Ctrl+F 聚焦
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // 滚动到当前激活项
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }, [query, onSearch])

  return (
    <div className="flex h-full flex-col">
      {/* 搜索输入 */}
      <form onSubmit={handleSubmit} className="shrink-0 p-2 border-b border-zinc-700/50">
        <div className="flex items-center gap-1.5 rounded-md bg-zinc-800 border border-zinc-700 px-2 py-1.5">
          <MagnifyingGlass size={14} className="shrink-0 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSearch(query)
              }
            }}
            placeholder="搜索内容…"
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 outline-none"
            aria-label="搜索 PDF 内容"
          />
          {searching && (
            <SpinnerGap size={14} className="shrink-0 text-zinc-400 animate-spin" />
          )}
        </div>
        {results.length > 0 && (
          <p className="mt-1.5 text-[11px] text-zinc-500 px-0.5">
            共 {results.length} 条结果
          </p>
        )}
      </form>

      {/* 结果列表 */}
      <div className="flex-1 overflow-y-auto">
        {!searching && results.length === 0 && query && (
          <p className="px-3 py-8 text-center text-sm text-zinc-500">无结果</p>
        )}
        {results.map((r, i) => (
          <button
            key={`${r.page}-${i}`}
            ref={i === activeIndex ? activeRef : undefined}
            onClick={() => onJump(i)}
            className={`w-full text-left px-3 py-2 border-b border-zinc-800 transition-colors
              ${i === activeIndex
                ? 'bg-zinc-700/60 text-zinc-100'
                : 'text-zinc-300 hover:bg-zinc-800/60'}`}
          >
            <span className="text-[11px] font-medium text-zinc-500">第 {r.page} 页</span>
            <p className="text-sm leading-snug mt-0.5 line-clamp-2"><HighlightText text={r.text} query={searchQuery} /></p>
          </button>
        ))}
      </div>
    </div>
  )
}
