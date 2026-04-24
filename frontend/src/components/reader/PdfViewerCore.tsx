'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { getDocument } from 'pdfjs-dist'
import {
  EventBus,
  PDFLinkService,
  PDFFindController,
  PDFViewer,
} from 'pdfjs-dist/web/pdf_viewer.mjs'
import type { AnnotationPosition } from '@/types/database'
import {
  scaledToViewport,
  getPagesFromRange,
  getClientRects,
  getBoundingRect,
  viewportPositionToScaled,
} from './lib/pdf-utils'
import { SelectionTip } from './SelectionTip'
import { HighlightPopup } from './HighlightPopup'

interface ReaderHighlight {
  id: string
  position: AnnotationPosition
  color: string
  comment: string
  annotationId: string
  userId?: string
}

export interface PdfViewerCoreProps {
  fileUrl: string
  scale: number | string
  highlights: ReaderHighlight[]
  scrollType: 'scroll' | 'page'
  displayMode: 'single' | 'double'
  canAnnotate: boolean
  canComment: boolean
  currentUserId?: string
  activeColor: string
  scrolledToHighlightId: string | null
  /* eslint-disable @typescript-eslint/no-explicit-any */
  onDocumentLoad: (doc: any) => void
  onViewerReady: (viewer: any) => void
  /* eslint-enable @typescript-eslint/no-explicit-any */
  onPageChange: (page: number) => void
  onTotalPages: (n: number) => void
  onScaleChange: (scale: number) => void
  onSelection: (position: AnnotationPosition, text: string) => void
  onComment: (position: AnnotationPosition, text: string, comment: string) => void
  onHighlightClick?: (id: string) => void
  onHighlightDelete?: (id: string) => void
  onHighlightUpdateComment?: (id: string, comment: string) => void
  onHighlightUpdateColor?: (id: string, color: string) => void
  onScrollAway?: () => void
  onLoadComplete?: () => void
  onError?: (error: string) => void
  initialPage?: number
}

export function PdfViewerCore({
  fileUrl,
  scale,
  highlights,
  canAnnotate,
  canComment,
  currentUserId,
  activeColor,
  scrolledToHighlightId,
  onDocumentLoad,
  onViewerReady,
  onPageChange,
  onTotalPages,
  onScaleChange,
  onSelection,
  onComment,
  onHighlightClick,
  onHighlightDelete,
  onHighlightUpdateComment,
  onHighlightUpdateColor,
  onScrollAway,
  onLoadComplete,
  onError,
  initialPage,
}: PdfViewerCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null)
  const numPagesRef = useRef(0)
  const highlightRootsRef = useRef<Map<number, Root>>(new Map())

  const [selectionPosition, setSelectionPosition] = useState<{
    left: number
    top: number
  } | null>(null)
  const [scaledPosition, setScaledPosition] = useState<AnnotationPosition | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const [hoveredHighlight, setHoveredHighlight] = useState<ReaderHighlight | null>(null)
  const [hoverPos, setHoverPos] = useState<{ left: number; top: number } | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showPopup = useCallback((hl: ReaderHighlight, x: number, y: number) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setHoveredHighlight(hl)
    setHoverPos({ left: x, top: y })
  }, [])

  const mouseOverPopupRef = useRef(false)

  const hidePopup = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      if (!mouseOverPopupRef.current) setHoveredHighlight(null)
    }, 150)
  }, [])

  // Detect highlight hover via mousemove on container
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const viewer = viewerRef.current
    if (!viewer || !highlights.length) return
    const containerEl = containerRef.current!
    const containerRect = containerEl.getBoundingClientRect()
    const cx = e.clientX - containerRect.left + containerEl.scrollLeft
    const cy = e.clientY - containerRect.top + containerEl.scrollTop

    // Find which page the cursor is on
    for (let pageNum = 1; pageNum <= numPagesRef.current; pageNum++) {
      const pageView = viewer.getPageView(pageNum - 1)
      if (!pageView?.div) continue
      const pageEl = pageView.div as HTMLElement
      const pageRect = pageEl.getBoundingClientRect()
      const px = e.clientX - pageRect.left
      const py = e.clientY - pageRect.top
      if (px < 0 || py < 0 || px > pageRect.width || py > pageRect.height) continue

      const viewport = { width: pageView.viewport.width, height: pageView.viewport.height }
      const pageHighlights = highlights.filter((h) => {
        const pn = h.position.pageNumber ?? h.position.boundingRect?.pageNumber ?? h.position.rects?.[0]?.pageNumber
        return pn === pageNum
      })
      for (const hl of pageHighlights) {
        for (const rect of hl.position.rects) {
          const vr = scaledToViewport(rect, viewport)
          if (px >= vr.left && px <= vr.left + vr.width && py >= vr.top && py <= vr.top + vr.height) {
            if (hoveredHighlight?.id !== hl.id) {
              showPopup(hl, cx, cy - 8)
            }
            return
          }
        }
      }
    }
    // Not over any highlight
    if (hoveredHighlight) hidePopup()
  }, [highlights, hoveredHighlight, showPopup, hidePopup])

  // debug
  // --- Highlight rendering ---
  const renderHighlightsRef = useRef<() => void>(() => {})
  const renderHighlights = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer || !numPagesRef.current || !viewer.pagesCount) return
    for (let pageNum = 1; pageNum <= numPagesRef.current; pageNum++) {
      const pageView = viewer.getPageView(pageNum - 1)
      if (!pageView?.textLayer?.div) continue
      const textLayerDiv = pageView.textLayer.div as HTMLDivElement
      let overlay = textLayerDiv.querySelector('.highlight-overlay') as HTMLDivElement
      if (!overlay) {
        overlay = document.createElement('div')
        overlay.className = 'highlight-overlay'
        overlay.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:1;'
        textLayerDiv.appendChild(overlay)
      }
      const pageHighlights = highlights.filter((h) => {
        const pn = h.position.pageNumber ?? h.position.boundingRect?.pageNumber ?? h.position.rects?.[0]?.pageNumber
        return pn === pageNum
      })
      let root = highlightRootsRef.current.get(pageNum)
      if (!root) {
        root = createRoot(overlay)
        highlightRootsRef.current.set(pageNum, root)
      }
      const viewport = { width: pageView.viewport.width, height: pageView.viewport.height }
      root.render(
        <>
          {pageHighlights.map((hl) => {
            const vrects = hl.position.rects.map((r) => scaledToViewport(r, viewport))
            const minLeft = Math.min(...vrects.map(r => r.left))
            const minTop = Math.min(...vrects.map(r => r.top))
            const maxRight = Math.max(...vrects.map(r => r.left + r.width))
            const maxBottom = Math.max(...vrects.map(r => r.top + r.height))
            return (
              <div
                key={hl.id}
                className={`highlight-group ${hl.id === scrolledToHighlightId ? 'highlight-group--scrolled-to' : ''}`}
                style={{ position: 'absolute', left: minLeft, top: minTop, width: maxRight - minLeft, height: maxBottom - minTop }}
                onClick={() => onHighlightClick?.(hl.id)}
              >
                {vrects.map((vr, i) => (
                  <div key={i} className="highlight-rect" style={{
                    position: 'absolute',
                    left: vr.left - minLeft, top: vr.top - minTop,
                    width: vr.width, height: vr.height,
                    background: hl.color || 'yellow', opacity: 1, borderRadius: 2,
                  }} />
                ))}
              </div>
            )
          })}
        </>,
      )
    }
  }, [highlights, scrolledToHighlightId, onHighlightClick, showPopup, hidePopup])

  renderHighlightsRef.current = renderHighlights

  // --- PDF loading & viewer setup ---
  useEffect(() => {
    if (!containerRef.current || !fileUrl) return
    const eventBus = new EventBus()
    const linkService = new PDFLinkService({ eventBus, externalLinkTarget: 2 })
    const findController = new PDFFindController({ linkService, eventBus })
    const viewer = new PDFViewer({
      container: containerRef.current,
      eventBus,
      textLayerMode: 2,
      removePageBorders: true,
      linkService,
      findController,
    })
    linkService.setViewer(viewer)
    viewerRef.current = viewer

    const task = getDocument(fileUrl)
    let cancelled = false

    task.promise
      .then((doc) => {
        if (cancelled) return
        viewer.setDocument(doc)
        linkService.setDocument(doc)
        numPagesRef.current = doc.numPages
        onDocumentLoad(doc)
        onTotalPages(doc.numPages)
        onViewerReady(viewer)
      }, (err) => {
        if (!cancelled) onError?.(err?.message || 'PDF 加载失败')
      })

    eventBus.on('pagechanging', (e: { pageNumber: number }) => {
      onPageChange(e.pageNumber)
      setTimeout(() => renderHighlightsRef.current(), 50)
    })
    eventBus.on('scalechanging', (e: { scale: number }) => onScaleChange(e.scale))
    eventBus.on('textlayerrendered', () => renderHighlightsRef.current())
    eventBus.on('pagesloaded', () => {
      if (initialPage && initialPage > 1 && initialPage <= numPagesRef.current) {
        console.log('[PdfViewer] pagesloaded: setting page', initialPage)
        viewer.currentPageNumber = initialPage
      }
      // Apply initial scale after pages are rendered
      console.log('[PdfViewer] pagesloaded: applying scale', scale)
      viewer.currentScaleValue = String(scale)
      onLoadComplete?.()
    })

    const roots = highlightRootsRef.current
    return () => {
      cancelled = true
      roots.forEach((root) => root.unmount())
      roots.clear()
      viewer.cleanup()
      task.destroy()
      viewerRef.current = null
    }
    // fileUrl is the only dep that should re-trigger full setup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl])

  // --- Scale ---
  useEffect(() => {
    if (viewerRef.current) {
      console.log('[PdfViewer] applying scale', scale)
      viewerRef.current.currentScaleValue = String(scale)
    }
  }, [scale])

  // --- Re-render highlights on data change ---
  useEffect(() => {
    renderHighlights()
  }, [renderHighlights])

  // --- Text selection ---
  const clearSelection = useCallback(() => {
    setSelectionPosition(null)
    setScaledPosition(null)
    setSelectedText('')
  }, [])

  const handlePointerDown = useCallback(() => {
    clearSelection()
    onScrollAway?.()
    window.getSelection()?.removeAllRanges()
  }, [clearSelection, onScrollAway])

  const handlePointerUp = useCallback(() => {
    if (!canAnnotate || !viewerRef.current) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    if (!containerRef.current?.contains(range.commonAncestorContainer)) return

    const pages = getPagesFromRange(range)
    if (!pages.length) return
    const rects = getClientRects(range, pages)
    if (!rects.length) return
    const bounding = getBoundingRect(rects)
    const scaled = viewportPositionToScaled({ boundingRect: bounding, rects }, viewerRef.current)

    const pageNum = pages[0].number
    const position: AnnotationPosition = {
      boundingRect: { ...scaled.boundingRect, pageNumber: pageNum },
      rects: scaled.rects.map((r) => ({ ...r, pageNumber: pageNum })),
      pageNumber: pageNum,
    }

    // Position tip at end of selection (bottom of last rect), relative to container
    const lastRect = rects[rects.length - 1]
    const lastPage = pages.find(p => p.number === lastRect.pageNumber) || pages[0]
    const containerEl = containerRef.current!
    const containerRect = containerEl.getBoundingClientRect()
    const pageRect = lastPage.node.getBoundingClientRect()
    setSelectionPosition({
      left: pageRect.left - containerRect.left + containerEl.scrollLeft + lastRect.left,
      top: pageRect.top - containerRect.top + containerEl.scrollTop + lastRect.top + lastRect.height,
    })
    setScaledPosition(position)
    setSelectedText(sel.toString())
  }, [canAnnotate])

  const handleHighlight = useCallback(() => {
    if (scaledPosition && selectedText) {
      onSelection(scaledPosition, selectedText)
    }
    clearSelection()
    window.getSelection()?.removeAllRanges()
  }, [scaledPosition, selectedText, onSelection, clearSelection])

  const handleCancelSelection = useCallback(() => {
    clearSelection()
    window.getSelection()?.removeAllRanges()
  }, [clearSelection])

  return (
    <div
      ref={containerRef}
      className="pdf-viewer-core"
      style={{ position: 'absolute', inset: 0, overflow: 'auto' }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onMouseMove={handleMouseMove}
    >
      <div className="pdfViewer" />

      {(canAnnotate || canComment) && selectionPosition && (
        <div
          className="pdf-viewer-core__tip"
          style={{
            position: 'absolute',
            left: selectionPosition.left,
            top: selectionPosition.top + 4,
            zIndex: 6,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <SelectionTip
            activeColor={activeColor}
            canAnnotate={canAnnotate}
            canComment={canComment}
            onHighlight={handleHighlight}
            onComment={(commentText) => {
              if (scaledPosition && selectedText) {
                onComment(scaledPosition, selectedText, commentText)
              }
              clearSelection()
              window.getSelection()?.removeAllRanges()
            }}
            onCancel={handleCancelSelection}
          />
        </div>
      )}

      {hoveredHighlight && hoverPos && (canAnnotate || hoveredHighlight.comment) && (
        <div
          className="highlight-popup"
          style={{
            position: 'absolute',
            left: hoverPos.left,
            top: hoverPos.top,
            zIndex: 7,
            transform: 'translateY(-100%)',
          }}
          onMouseEnter={() => { mouseOverPopupRef.current = true; if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current) }}
          onMouseLeave={() => { mouseOverPopupRef.current = false; setHoveredHighlight(null) }}
        >
          <HighlightPopup
            highlight={hoveredHighlight}
            isOwner={!currentUserId || hoveredHighlight.userId === currentUserId}
            onDelete={() => { onHighlightDelete?.(hoveredHighlight.id); setHoveredHighlight(null) }}
            onUpdateComment={(comment) => onHighlightUpdateComment?.(hoveredHighlight.id, comment)}
            onUpdateColor={(color) => {
              onHighlightUpdateColor?.(hoveredHighlight.id, color)
              setHoveredHighlight({ ...hoveredHighlight, color })
            }}
          />
        </div>
      )}

      <style>{`.pdf-viewer-core .textLayer ::selection { background: ${canAnnotate ? activeColor : 'rgba(255,255,100,0.4)'}; }`}</style>
    </div>
  )
}

export default PdfViewerCore
