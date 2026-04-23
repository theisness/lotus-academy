'use client'

import { useEffect } from 'react'
import { GlobalWorkerOptions } from 'pdfjs-dist'
import { ReaderToolbar } from './ReaderToolbar'
import { ReaderContent } from './ReaderContent'
import { useReaderState } from './hooks/useReaderState'
import type { PdfReaderProps } from './types'

import 'react-pdf-highlighter-extended/dist/esm/style/TextHighlight.css'
import 'react-pdf-highlighter-extended/dist/esm/style/PdfHighlighter.css'

// Re-export for external consumers
export { HIGHLIGHT_COLORS } from './constants'

// 使用本地 worker 文件，避免从 unpkg.com 下载
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerPort = new Worker(
    new URL('/pdf-worker/pdf.worker.min.mjs', window.location.origin),
    { type: 'module' }
  )
}

/**
 * PdfReader — PDF 阅读器核心组件
 *
 * 封装 react-pdf-highlighter-extended，提供：
 * - PDF 文件加载与渲染
 * - 文本高亮批注（多色选择）
 * - 笔记面板（当前页面笔记）
 * - 工具栏（翻页、缩放、批注工具）
 * - 批注权限控制
 */
export function PdfReader({
  bookId,
  fileUrl,
  canAnnotate,
  bookTitle,
  onBack,
}: PdfReaderProps) {
  const state = useReaderState(bookId, canAnnotate)

  const { searchOpen, handleToggleSearch } = state

  // Ctrl+F / Cmd+F 打开搜索
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        if (!searchOpen) handleToggleSearch()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [searchOpen, handleToggleSearch])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-900">
      <ReaderToolbar
        bookTitle={bookTitle}
        currentPage={state.currentPage}
        totalPages={state.totalPages}
        scale={state.actualScale}
        canAnnotate={canAnnotate}
        activeColor={state.activeColor}
        sidePanelOpen={state.sidePanelOpen}
        onToggleSidePanel={() => state.setSidePanelOpen((prev) => !prev)}
        noteCount={state.allNotes.length}
        highlightCount={state.highlights.length}
        onBack={onBack}
        onPageChange={state.handlePageChange}
        onScaleChange={state.handleScaleChange}
        onColorChange={state.handleColorChange}
        outlineOpen={state.outlineOpen}
        onToggleOutline={() => state.setOutlineOpen((prev) => !prev)}
        scrollType={state.scrollType}
        displayMode={state.displayMode}
        onScrollTypeChange={state.handleScrollTypeChange}
        onDisplayModeChange={state.handleDisplayModeChange}
        searchOpen={state.searchOpen}
        onToggleSearch={state.handleToggleSearch}
      />
      <ReaderContent fileUrl={fileUrl} canAnnotate={canAnnotate} state={state} />
    </div>
  )
}
