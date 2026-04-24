'use client'

import { useEffect } from 'react'
import { GlobalWorkerOptions } from 'pdfjs-dist'
import 'pdfjs-dist/web/pdf_viewer.css'
import { ReaderToolbar } from './ReaderToolbar'
import { ReaderContent } from './ReaderContent'
import { useReaderState } from './hooks/useReaderState'
import type { PdfReaderProps } from './types'

export { HIGHLIGHT_COLORS } from './constants'

GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs'

export function PdfReader({ bookId, fileUrl, canAnnotate, canNote, canComment, currentUserNickname, bookTitle, onBack, onCopyToPersonal }: PdfReaderProps) {
  const state = useReaderState(bookId, canAnnotate)
  const { searchOpen, handleToggleSearch } = state

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        if (!searchOpen) handleToggleSearch()
        return
      }
      if (state.scrollType === 'page') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          state.handleNextPage()
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          state.handlePrevPage()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [searchOpen, handleToggleSearch, state])

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
        onCopyToPersonal={onCopyToPersonal}
      />
      <ReaderContent fileUrl={fileUrl} canAnnotate={canAnnotate} canNote={canNote} canComment={canComment ?? false} currentUserNickname={currentUserNickname} state={state} />
    </div>
  )
}
