import { useState, useRef, useCallback, useMemo } from 'react'
import { ScrollMode, SpreadMode } from 'pdfjs-dist/web/pdf_viewer.mjs'
import type {
  PdfHighlighterUtils,
  PdfSelection,
  PdfScaleValue,
  ScaledPosition,
} from 'react-pdf-highlighter-extended'
import { useAnnotations } from '@/hooks/useAnnotations'
import type { AnnotationPosition } from '@/types/database'
import { HIGHLIGHT_COLORS, DEFAULT_COLOR, COLOR_STORAGE_KEY } from '../constants'
import type { ReaderHighlight } from '../types'

export function useReaderState(bookId: string, canAnnotate: boolean) {
  const {
    annotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
  } = useAnnotations(bookId)

  const highlighterUtilsRef = useRef<PdfHighlighterUtils>()
  const currentSelectionRef = useRef<PdfSelection | null>(null)
  const pdfDocumentRef = useRef<import('pdfjs-dist').PDFDocumentProxy | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState<PdfScaleValue>('page-width')
  const [activeColor, setActiveColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(COLOR_STORAGE_KEY)
      if (saved && HIGHLIGHT_COLORS.some((c) => c.value === saved)) return saved
    }
    return DEFAULT_COLOR
  })
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [sidePanelTab, setSidePanelTab] = useState<'annotations' | 'notes'>('annotations')
  const [isLoading, setIsLoading] = useState(true)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [mobileArrowsVisible, setMobileArrowsVisible] = useState(true)
  const [scrolledToHighlightId, setScrolledToHighlightId] = useState<string | null>(null)

  const [scrollType, setScrollType] = useState<'scroll' | 'page'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reader-scroll-type')
      if (saved === 'scroll' || saved === 'page') return saved
    }
    return 'scroll'
  })

  const [displayMode, setDisplayMode] = useState<'single' | 'double'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reader-display-mode')
      if (saved === 'single' || saved === 'double') return saved
    }
    return 'single'
  })

  // --- derived data ---

  const highlights: ReaderHighlight[] = useMemo(() => {
    return annotations
      .filter((ann) => ann.type === 'highlight')
      .map((ann) => ({
        id: ann.id,
        type: 'text' as const,
        position: {
          boundingRect: (ann.position as AnnotationPosition).boundingRect as ScaledPosition['boundingRect'],
          rects: (ann.position as AnnotationPosition).rects as ScaledPosition['rects'],
        },
        color: ann.color || DEFAULT_COLOR,
        comment: ann.content || '',
        annotationId: ann.id,
      }))
  }, [annotations])

  const allNotes = useMemo(() => {
    return annotations.filter((ann) => ann.type === 'note')
  }, [annotations])

  const actualScale = typeof scale === 'number' ? scale
    : (highlighterUtilsRef.current?.getViewer()?.currentScale ?? 1.0)

  // --- callbacks ---

  const handleColorChange = useCallback((color: string) => {
    setActiveColor(color)
    try { localStorage.setItem(COLOR_STORAGE_KEY, color) } catch {}
  }, [])

  const handleScrollToHighlight = useCallback((id: string) => {
    const hl = highlights.find((h) => h.id === id)
    if (hl) {
      highlighterUtilsRef.current?.scrollToHighlight(hl)
      setScrolledToHighlightId(id)
    }
  }, [highlights])

  const handleSelection = useCallback((selection: PdfSelection) => {
    if (!canAnnotate) return
    currentSelectionRef.current = selection
  }, [canAnnotate])

  const handleCreateHighlight = useCallback(async () => {
    if (!canAnnotate || !currentSelectionRef.current) return
    const ghostHighlight = currentSelectionRef.current.makeGhostHighlight()
    if (!ghostHighlight) return
    try {
      await addAnnotation({
        type: 'highlight',
        position: ghostHighlight.position as unknown as AnnotationPosition,
        color: activeColor,
        content: null,
        page_number: ghostHighlight.position.boundingRect.pageNumber,
      })
    } catch {}
    highlighterUtilsRef.current?.removeGhostHighlight()
    highlighterUtilsRef.current?.setTip(null)
    currentSelectionRef.current = null
  }, [canAnnotate, addAnnotation, activeColor])

  const handleCancelSelection = useCallback(() => {
    highlighterUtilsRef.current?.removeGhostHighlight()
    highlighterUtilsRef.current?.setTip(null)
    currentSelectionRef.current = null
  }, [])

  const handlePrevPage = useCallback(() => {
    const step = displayMode === 'double' ? 2 : 1
    const newPage = Math.max(1, currentPage - step)
    if (newPage !== currentPage) {
      setCurrentPage(newPage)
      const viewer = highlighterUtilsRef.current?.getViewer()
      if (viewer) viewer.currentPageNumber = newPage
    }
  }, [currentPage, displayMode])

  const handleNextPage = useCallback(() => {
    const step = displayMode === 'double' ? 2 : 1
    const newPage = Math.min(totalPages, currentPage + step)
    if (newPage !== currentPage) {
      setCurrentPage(newPage)
      const viewer = highlighterUtilsRef.current?.getViewer()
      if (viewer) viewer.currentPageNumber = newPage
    }
  }, [currentPage, totalPages, displayMode])

  const handleDeleteHighlight = useCallback(async (highlightId: string) => {
    if (!canAnnotate) return
    try { await deleteAnnotation(highlightId) } catch {}
  }, [canAnnotate, deleteAnnotation])

  const handleUpdateComment = useCallback(async (highlightId: string, comment: string) => {
    if (!canAnnotate) return
    try { await updateAnnotation(highlightId, { content: comment || null }) } catch {}
  }, [canAnnotate, updateAnnotation])

  const handleAddNote = useCallback(async (content: string) => {
    if (!canAnnotate || !content.trim()) return
    try {
      await addAnnotation({
        type: 'note',
        position: {
          boundingRect: { x1: 0, y1: 0, x2: 0, y2: 0, width: 0, height: 0, pageNumber: currentPage },
          rects: [],
          pageNumber: currentPage,
        },
        color: null,
        content: content.trim(),
        page_number: currentPage,
      })
    } catch {}
  }, [canAnnotate, addAnnotation, currentPage])

  const handleUpdateNote = useCallback(async (noteId: string, content: string) => {
    if (!canAnnotate) return
    try { await updateAnnotation(noteId, { content: content.trim() || null }) } catch {}
  }, [canAnnotate, updateAnnotation])

  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!canAnnotate) return
    try { await deleteAnnotation(noteId) } catch {}
  }, [canAnnotate, deleteAnnotation])

  const handlePageChange = useCallback((page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
    const viewer = highlighterUtilsRef.current?.getViewer()
    if (viewer) viewer.currentPageNumber = page
  }, [totalPages])

  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale)
  }, [])

  const applyViewerModes = useCallback((scroll: 'scroll' | 'page', display: 'single' | 'double') => {
    const viewer = highlighterUtilsRef.current?.getViewer()
    if (!viewer) return
    viewer.scrollMode = scroll === 'scroll' ? ScrollMode.VERTICAL : ScrollMode.PAGE
    viewer.spreadMode = display === 'double' ? SpreadMode.ODD : SpreadMode.NONE
    const fitMode = display === 'double' ? 'page-fit' : 'page-width'
    setScale(fitMode)
    setTimeout(() => {
      if (viewer.currentScale) setScale(viewer.currentScale)
    }, 100)
  }, [])

  const handleScrollTypeChange = useCallback((type: 'scroll' | 'page') => {
    setScrollType(type)
    try { localStorage.setItem('reader-scroll-type', type) } catch {}
    applyViewerModes(type, displayMode)
  }, [displayMode, applyViewerModes])

  const handleDisplayModeChange = useCallback((mode: 'single' | 'double') => {
    setDisplayMode(mode)
    try { localStorage.setItem('reader-display-mode', mode) } catch {}
    applyViewerModes(scrollType, mode)
  }, [scrollType, applyViewerModes])

  return {
    // refs
    highlighterUtilsRef,
    currentSelectionRef,
    pdfDocumentRef,
    // state
    annotations,
    currentPage, setCurrentPage,
    totalPages, setTotalPages,
    scale, setScale,
    activeColor,
    sidePanelOpen, setSidePanelOpen,
    sidePanelTab, setSidePanelTab,
    isLoading, setIsLoading,
    outlineOpen, setOutlineOpen,
    mobileArrowsVisible, setMobileArrowsVisible,
    scrolledToHighlightId, setScrolledToHighlightId,
    scrollType,
    displayMode,
    // derived
    highlights,
    allNotes,
    actualScale,
    // callbacks
    handleColorChange,
    handleScrollToHighlight,
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
    handleScaleChange,
    handleScrollTypeChange,
    handleDisplayModeChange,
    applyViewerModes,
  }
}
