'use client'

import React from 'react'
import { ScrollMode, SpreadMode } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { PdfLoader } from 'react-pdf-highlighter-extended'
import type { PdfHighlighterUtils } from 'react-pdf-highlighter-extended'
import { SpinnerGap, WarningCircle, CaretLeft, CaretRight, X } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { OutlinePanel } from './OutlinePanel'
import { AnnotationPanel } from './AnnotationPanel'
import { NotePanel } from './NotePanel'
import { SelectionTip } from './SelectionTip'
import { PdfHighlighterWithPages } from './PdfHighlighterWithPages'
import { HighlightContainer } from './HighlightContainer'
import type { useReaderState } from './hooks/useReaderState'

type ReaderState = ReturnType<typeof useReaderState>

interface ReaderContentProps {
  fileUrl: string
  canAnnotate: boolean
  state: ReaderState
}

export function ReaderContent({ fileUrl, canAnnotate, state }: ReaderContentProps) {
  const {
    highlighterUtilsRef,
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
    handleCancelSelection,
    handlePrevPage,
    handleNextPage,
    handleDeleteHighlight,
    handleUpdateComment,
    handleAddNote,
    handleUpdateNote,
    handleDeleteNote,
    handlePageChange,
    handleScrollToHighlight,
    totalPages,
  } = state

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* 章节边栏 */}
      {outlineOpen && pdfDocumentRef.current && (
        <div className="w-64 shrink-0 border-r border-zinc-700 bg-zinc-800/50 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-zinc-700 text-xs font-medium text-zinc-400 uppercase tracking-wider">
            章节目录
          </div>
          <OutlinePanel
            pdfDocument={pdfDocumentRef.current}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* PDF 阅读器 */}
      <div
        className={`relative flex-1 overflow-auto${scrollType === 'page' ? ' pdf-page-mode' : ''}`}
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

        <PdfLoader
          document={fileUrl}
          workerSrc="/pdf-worker/pdf.worker.min.mjs"
          beforeLoad={() => {
            setIsLoading(true)
            return (
              <div className="flex h-full items-center justify-center">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="inline-flex text-[var(--color-accent)]"
                >
                  <SpinnerGap size={32} />
                </motion.span>
              </div>
            )
          }}
          errorMessage={(error) => {
            console.error('[PdfReader] Load error:', error)
            setIsLoading(false)
            return (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <WarningCircle size={32} weight="duotone" className="text-zinc-400" />
                <p className="text-sm text-zinc-400">PDF 文件加载失败</p>
                <p className="text-xs text-zinc-500">{String(error)}</p>
              </div>
            )
          }}
        >
          {(pdfDocument) => {
            pdfDocumentRef.current = pdfDocument
            return (
              <PdfHighlighterWithPages
                key={fileUrl}
                pdfDocument={pdfDocument}
                onTotalPages={setTotalPages}
                onLoadComplete={() => {
                  setIsLoading(false)
                  const viewer = highlighterUtilsRef.current?.getViewer()
                  if (viewer) {
                    viewer.scrollMode = scrollType === 'scroll' ? ScrollMode.VERTICAL : ScrollMode.PAGE
                    viewer.spreadMode = displayMode === 'double' ? SpreadMode.ODD : SpreadMode.NONE
                  }
                  setTimeout(() => {
                    const v = highlighterUtilsRef.current?.getViewer()
                    if (v?.currentScale) setScale(v.currentScale)
                  }, 100)
                }}
                highlights={highlights}
                pdfScaleValue={scale}
                onSelection={canAnnotate ? handleSelection : undefined}
                textSelectionColor={canAnnotate ? activeColor : 'transparent'}
                utilsRef={(utils: PdfHighlighterUtils) => {
                  highlighterUtilsRef.current = utils
                  const viewer = utils.getViewer()
                  if (viewer?.eventBus) {
                    viewer.eventBus.on('pagechanging', (e: { pageNumber: number }) => {
                      setCurrentPage(e.pageNumber)
                    })
                  }
                }}
                selectionTip={canAnnotate ? (
                  <SelectionTip
                    activeColor={activeColor}
                    onHighlight={handleCreateHighlight}
                    onCancel={handleCancelSelection}
                  />
                ) : undefined}
                onScrollAway={() => setScrolledToHighlightId(null)}
              >
                <HighlightContainer
                  canAnnotate={canAnnotate}
                  onDelete={handleDeleteHighlight}
                  onUpdateComment={handleUpdateComment}
                  scrolledToHighlightId={scrolledToHighlightId}
                />
              </PdfHighlighterWithPages>
            )
          }}
        </PdfLoader>

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
            {/* Tab 头 */}
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
              <button
                onClick={() => setSidePanelOpen(false)}
                className="p-2 text-zinc-500 hover:text-zinc-300"
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>
            {/* Tab 内容 */}
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
                  canAnnotate={canAnnotate}
                  onAddNote={handleAddNote}
                  onUpdateNote={handleUpdateNote}
                  onDeleteNote={handleDeleteNote}
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
