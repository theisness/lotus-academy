'use client'

import React from 'react'
import { ScrollMode, SpreadMode } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { SpinnerGap, CaretLeft, CaretRight, X } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { OutlinePanel } from './OutlinePanel'
import { SearchPanel } from './SearchPanel'
import { AnnotationPanel } from './AnnotationPanel'
import { NotePanel } from './NotePanel'
import { PdfViewerCore } from './PdfViewerCore'
import { useAuthContext } from '@/components/providers/AuthProvider'
import type { useReaderState } from './hooks/useReaderState'

type ReaderState = ReturnType<typeof useReaderState>

interface ReaderContentProps {
  fileUrl: string
  canAnnotate: boolean
  canNote?: boolean
  canComment: boolean
  currentUserNickname?: string
  state: ReaderState
}

export function ReaderContent({ fileUrl, canAnnotate, canNote, canComment, state }: ReaderContentProps) {
  const { user } = useAuthContext()
  const {
    viewerRef,
    pdfDocumentRef,
    currentPage,
    setCurrentPage,
    setTotalPages,
    scale,
    setScale,
    activeColor,
    sidePanelOpen,
    setSidePanelOpen,
    sidePanelTab,
    setSidePanelTab,
    isLoading,
    setIsLoading,
    outlineOpen,
    mobileArrowsVisible,
    setMobileArrowsVisible,
    scrolledToHighlightId,
    setScrolledToHighlightId,
    scrollType,
    displayMode,
    annotations,
    highlights,
    allNotes,
    handleSelection,
    handleCreateHighlight,
    handleCreateComment,
    handlePrevPage,
    handleNextPage,
    handleDeleteHighlight,
    handleUpdateComment,
    handleUpdateColor,
    handleAddNote,
    handleUpdateNote,
    handleDeleteNote,
    handlePageChange,
    handleScrollToHighlight,
    totalPages,
    searchOpen,
    searchResults,
    searchActiveIndex,
    searchSearching,
    searchQuery,
    searchInputQuery,
    setSearchInputQuery,
    handleSearch,
    handleSearchJump,
  } = state

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* 章节边栏 */}
      {outlineOpen && pdfDocumentRef.current && (
        <div className="w-64 shrink-0 border-r border-zinc-700 bg-zinc-800/50 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-zinc-700 text-xs font-medium text-zinc-400 uppercase tracking-wider">
            章节目录
          </div>
          <OutlinePanel pdfDocument={pdfDocumentRef.current} onPageChange={handlePageChange} />
        </div>
      )}

      {/* 搜索边栏 */}
      {searchOpen && (
        <div className="w-full sm:w-72 shrink-0 border-r border-zinc-700 bg-zinc-800/50
          overflow-hidden flex flex-col absolute sm:relative inset-0 sm:inset-auto z-30 sm:z-auto">
          <SearchPanel
            results={searchResults}
            searching={searchSearching}
            activeIndex={searchActiveIndex}
            query={searchQuery}
            inputQuery={searchInputQuery}
            onInputQueryChange={setSearchInputQuery}
            onSearch={handleSearch}
            onJump={handleSearchJump}
          />
        </div>
      )}

      {/* PDF 阅读器 */}
      <div
        className={`relative flex-1 overflow-hidden${scrollType === 'page' ? ' pdf-page-mode' : ''}`}
        onPointerUp={() => { if (mobileArrowsVisible) setMobileArrowsVisible(false) }}
      >
        {/* 加载指示器 */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900">
            <div className="flex flex-col items-center gap-4">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="inline-flex text-[var(--color-accent)]"
              >
                <SpinnerGap size={40} />
              </motion.span>
              <p className="text-sm text-zinc-400">正在加载 PDF...</p>
            </div>
          </div>
        )}

        <PdfViewerCore
          fileUrl={fileUrl}
          scale={scale}
          highlights={highlights}
          scrollType={scrollType}
          displayMode={displayMode}
          canAnnotate={canAnnotate}
          canComment={canComment}
          currentUserId={user?.id}
          activeColor={activeColor}
          scrolledToHighlightId={scrolledToHighlightId}
          onDocumentLoad={(doc) => { pdfDocumentRef.current = doc }}
          onViewerReady={(viewer) => {
            viewerRef.current = viewer
          }}
          onPageChange={setCurrentPage}
          onTotalPages={setTotalPages}
          onScaleChange={(s) => setScale(s)}
          onSelection={(position, text) => {
            handleSelection(position, text)
            handleCreateHighlight()
          }}
          onComment={(position, text, comment) => handleCreateComment(position, text, comment)}
          onHighlightClick={(id) => handleScrollToHighlight(id)}
          onHighlightDelete={(id) => handleDeleteHighlight(id)}
          onHighlightUpdateComment={(id, comment) => handleUpdateComment(id, comment)}
          onHighlightUpdateColor={(id, color) => handleUpdateColor(id, color)}
          onScrollAway={() => setScrolledToHighlightId(null)}
          onLoadComplete={() => {
            setIsLoading(false)
            const v = viewerRef.current
            if (v) {
              v.scrollMode = scrollType === 'scroll' ? ScrollMode.VERTICAL : ScrollMode.PAGE
              v.spreadMode = displayMode === 'double' ? SpreadMode.ODD : SpreadMode.NONE
            }
            setTimeout(() => {
              if (viewerRef.current?.currentScale) setScale(viewerRef.current.currentScale)
            }, 100)
          }}
          onError={(err) => {
            setIsLoading(false)
            console.error('[PdfReader] Load error:', err)
          }}
        />

        {/* 边缘翻页箭头（仅在单屏切换模式显示） */}
        {scrollType === 'page' && (
          <>
            <div
              className="absolute left-0 top-0 bottom-0 w-24 z-20 group flex items-center justify-start pl-3"
              onPointerUp={(e) => {
                if (!mobileArrowsVisible) { e.stopPropagation(); setMobileArrowsVisible(true) }
              }}
            >
              <button
                onPointerUp={(e) => { e.stopPropagation(); handlePrevPage() }}
                disabled={currentPage <= 1}
                className={`p-3 rounded-full bg-zinc-800/40 hover:bg-zinc-800/70
                  ${mobileArrowsVisible ? 'opacity-60' : 'opacity-0'} sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300
                  disabled:opacity-0 disabled:cursor-not-allowed`}
              >
                <CaretLeft size={28} className="text-zinc-300" />
              </button>
            </div>
            <div
              className="absolute right-0 top-0 bottom-0 w-24 z-20 group flex items-center justify-end pr-3"
              onPointerUp={(e) => {
                if (!mobileArrowsVisible) { e.stopPropagation(); setMobileArrowsVisible(true) }
              }}
            >
              <button
                onPointerUp={(e) => { e.stopPropagation(); handleNextPage() }}
                disabled={currentPage >= totalPages}
                className={`p-3 rounded-full bg-zinc-800/40 hover:bg-zinc-800/70
                  ${mobileArrowsVisible ? 'opacity-60' : 'opacity-0'} sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300
                  disabled:opacity-0 disabled:cursor-not-allowed`}
              >
                <CaretRight size={28} className="text-zinc-300" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* 侧边面板（批注 + 笔记 tab 切换） */}
      {sidePanelOpen && (
        <div className="shrink-0 border-l border-zinc-700/50 bg-zinc-900 overflow-hidden
          w-full sm:w-auto absolute sm:relative inset-0 sm:inset-auto z-30 sm:z-auto">
          <div className="flex h-full w-full sm:w-[320px] flex-col">
            <div className="flex items-center border-b border-zinc-700/50">
              <button
                onClick={() => setSidePanelTab('annotations')}
                className={`flex-1 py-2 text-xs font-medium text-center transition-colors
                  ${sidePanelTab === 'annotations' ? 'text-zinc-200 border-b-2 border-[var(--color-accent)]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                批注 {highlights.length > 0 && `(${highlights.length})`}
              </button>
              <button
                onClick={() => setSidePanelTab('notes')}
                className={`flex-1 py-2 text-xs font-medium text-center transition-colors
                  ${sidePanelTab === 'notes' ? 'text-zinc-200 border-b-2 border-[var(--color-accent)]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                笔记 {allNotes.length > 0 && `(${allNotes.length})`}
              </button>
              <button onClick={() => setSidePanelOpen(false)} className="p-2 text-zinc-500 hover:text-zinc-300" aria-label="关闭">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {sidePanelTab === 'annotations' ? (
                <AnnotationPanel
                  annotations={annotations}
                  canAnnotate={canAnnotate}
                  onDelete={handleDeleteHighlight}
                  onUpdateComment={handleUpdateComment}
                  onScrollTo={handleScrollToHighlight}
                  embedded
                />
              ) : (
                <NotePanel
                  notes={allNotes}
                  currentPage={currentPage}
                  canAnnotate={canNote ?? canAnnotate}
                  currentUserId={user?.id}
                  isAdmin={canAnnotate}
                  onAddNote={handleAddNote}
                  onUpdateNote={handleUpdateNote}
                  onDeleteNote={handleDeleteNote}
                  onNavigateToPage={handlePageChange}
                  embedded
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
