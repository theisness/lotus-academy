import { useState, useRef, useCallback, useMemo } from 'react'
import { ScrollMode, SpreadMode } from 'pdfjs-dist/web/pdf_viewer.mjs'
import { useAnnotations } from '@/hooks/useAnnotations'
import type { AnnotationPosition } from '@/types/database'
import { scaledToViewport } from '../lib/pdf-utils'
import { HIGHLIGHT_COLORS, DEFAULT_COLOR, COLOR_STORAGE_KEY } from '../constants'
import type { ReaderHighlight } from '../types'

const SCROLL_MARGIN = 10

export function useReaderState(bookId: string, canAnnotate: boolean) {
  const { annotations, addAnnotation, updateAnnotation, deleteAnnotation } = useAnnotations(bookId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null)
  const pendingSelectionRef = useRef<{ position: AnnotationPosition; text: string } | null>(null)
  const pdfDocumentRef = useRef<import('pdfjs-dist').PDFDocumentProxy | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState<number | string>('page-width')
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

  // search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<Array<{ page: number; text: string; matchIdx: number }>>([])
  const [searchActiveIndex, setSearchActiveIndex] = useState(-1)
  const [searchSearching, setSearchSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInputQuery, setSearchInputQuery] = useState('')

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
        position: ann.position as AnnotationPosition,
        color: ann.color || DEFAULT_COLOR,
        comment: ann.content || '',
        annotationId: ann.id,
      }))
  }, [annotations])

  const allNotes = useMemo(() => {
    return annotations.filter((ann) => ann.type === 'note')
  }, [annotations])

  const actualScale = viewerRef.current?.currentScale ?? 1.0

  // --- callbacks ---

  const handleColorChange = useCallback((color: string) => {
    setActiveColor(color)
    try { localStorage.setItem(COLOR_STORAGE_KEY, color) } catch {}
  }, [])

  const handleScrollToHighlight = useCallback((id: string) => {
    const hl = highlights.find((h) => h.id === id)
    const viewer = viewerRef.current
    if (!hl || !viewer) return
    const pageNumber = hl.position.boundingRect.pageNumber ?? hl.position.pageNumber
    const pageView = viewer.getPageView(pageNumber - 1)
    if (!pageView) return
    const viewport = pageView.viewport
    const vr = scaledToViewport(hl.position.boundingRect, viewport)
    viewer.scrollPageIntoView({
      pageNumber,
      destArray: [null, { name: 'XYZ' }, ...viewport.convertToPdfPoint(0, vr.top - SCROLL_MARGIN), 0],
    })
    setScrolledToHighlightId(id)
    setTimeout(() => setScrolledToHighlightId(null), 2000)
  }, [highlights])

  const handleSelection = useCallback((position: AnnotationPosition, text: string) => {
    if (!canAnnotate) return
    pendingSelectionRef.current = { position, text }
  }, [canAnnotate])

  const handleCreateHighlight = useCallback(async () => {
    if (!canAnnotate || !pendingSelectionRef.current) return
    const { position } = pendingSelectionRef.current
    try {
      await addAnnotation({
        type: 'highlight',
        position,
        color: activeColor,
        content: null,
        page_number: position.pageNumber,
      })
    } catch {}
    pendingSelectionRef.current = null
  }, [canAnnotate, addAnnotation, activeColor])

  const handleCancelSelection = useCallback(() => {
    pendingSelectionRef.current = null
  }, [])

  const handleCreateComment = useCallback(async (position: AnnotationPosition, text: string, comment: string) => {
    if (!comment.trim()) return
    try {
      await addAnnotation({
        type: 'highlight',
        position,
        color: activeColor,
        content: comment.trim(),
        page_number: position.pageNumber,
      })
    } catch {}
  }, [addAnnotation, activeColor])

  const handlePrevPage = useCallback(() => {
    const step = displayMode === 'double' ? 2 : 1
    const newPage = Math.max(1, currentPage - step)
    if (newPage !== currentPage) {
      setCurrentPage(newPage)
      if (viewerRef.current) viewerRef.current.currentPageNumber = newPage
    }
  }, [currentPage, displayMode])

  const handleNextPage = useCallback(() => {
    const step = displayMode === 'double' ? 2 : 1
    const newPage = Math.min(totalPages, currentPage + step)
    if (newPage !== currentPage) {
      setCurrentPage(newPage)
      if (viewerRef.current) viewerRef.current.currentPageNumber = newPage
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

  const handleUpdateColor = useCallback(async (highlightId: string, color: string) => {
    if (!canAnnotate) return
    try { await updateAnnotation(highlightId, { color }) } catch {}
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
    if (viewerRef.current) viewerRef.current.currentPageNumber = page
  }, [totalPages])

  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale)
  }, [])

  const applyViewerModes = useCallback((scroll: 'scroll' | 'page', display: 'single' | 'double') => {
    const viewer = viewerRef.current
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

  // --- search callbacks ---

  const handleSearch = useCallback(async (query: string) => {
    const doc = pdfDocumentRef.current
    if (!doc || !query.trim()) {
      setSearchResults([])
      setSearchActiveIndex(-1)
      setSearchQuery('')
      viewerRef.current?.eventBus?.dispatch('findbarclose', { source: null })
      return
    }
    setSearchSearching(true)
    setSearchQuery(query.trim())
    const q = query.toLowerCase()
    const results: Array<{ page: number; text: string; matchIdx: number }> = []
    const CONTEXT = 30

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join('')
      let start = 0
      let matchIdx = 0
      const lower = pageText.toLowerCase()
      while (true) {
        const idx = lower.indexOf(q, start)
        if (idx === -1) break
        const snippetStart = Math.max(0, idx - CONTEXT)
        const snippetEnd = Math.min(pageText.length, idx + query.length + CONTEXT)
        const snippet =
          (snippetStart > 0 ? '…' : '') +
          pageText.slice(snippetStart, snippetEnd) +
          (snippetEnd < pageText.length ? '…' : '')
        results.push({ page: i, text: snippet, matchIdx })
        start = idx + 1
        matchIdx++
      }
    }

    setSearchResults(results)
    setSearchActiveIndex(results.length > 0 ? 0 : -1)
    setSearchSearching(false)

    if (results.length > 0) {
      viewerRef.current?.eventBus?.dispatch('find', {
        source: null, type: '', query: query.trim(),
        caseSensitive: false, entireWord: false,
        highlightAll: true, findPrevious: false, matchDiacritics: false,
      })
    }
  }, [])

  const handleSearchJump = useCallback((index: number) => {
    const r = searchResults[index]
    if (!r) return
    setSearchActiveIndex(index)
    handlePageChange(r.page)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = viewerRef.current?.findController as any
    if (fc?._selected) {
      fc._selected.pageIdx = r.page - 1
      fc._selected.matchIdx = r.matchIdx
      viewerRef.current!.eventBus.dispatch('updatetextlayermatches', { source: null, pageIndex: -1 })
    }
  }, [searchResults, handlePageChange])

  const handleSearchClose = useCallback(() => {
    setSearchOpen(false)
  }, [])

  const handleToggleSearch = useCallback(() => {
    setSearchOpen((prev) => !prev)
  }, [])
  return {
    viewerRef,
    pdfDocumentRef,
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
    scrollType, displayMode,
    highlights, allNotes, actualScale,
    handleColorChange, handleScrollToHighlight,
    handleSelection, handleCreateHighlight, handleCancelSelection, handleCreateComment,
    handlePrevPage, handleNextPage,
    handleDeleteHighlight, handleUpdateComment, handleUpdateColor,
    handleAddNote, handleUpdateNote, handleDeleteNote,
    handlePageChange, handleScaleChange,
    handleScrollTypeChange, handleDisplayModeChange, applyViewerModes,
    searchOpen, searchResults, searchActiveIndex, searchSearching, searchQuery, searchInputQuery, setSearchInputQuery,
    handleSearch, handleSearchJump, handleSearchClose, handleToggleSearch,
  }
}
