'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import React from 'react'
import { GlobalWorkerOptions } from 'pdfjs-dist'
import { ScrollMode, SpreadMode } from 'pdfjs-dist/web/pdf_viewer.mjs'
import {
  PdfLoader,
  PdfHighlighter,
  TextHighlight,
  useHighlightContainerContext,
  MonitoredHighlightContainer,
} from 'react-pdf-highlighter-extended'
import type {
  Highlight,
  PdfHighlighterUtils,
  PdfSelection,
  ScaledPosition,
  PdfScaleValue,
} from 'react-pdf-highlighter-extended'
import { SpinnerGap, WarningCircle, CaretLeft, CaretRight, X } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useAnnotations } from '@/hooks/useAnnotations'
import type { AnnotationPosition } from '@/types/database'
import { ReaderToolbar } from './ReaderToolbar'
import { NotePanel } from './NotePanel'
import { SelectionTip } from './SelectionTip'
import { HighlightPopup } from './HighlightPopup'
import { OutlinePanel } from './OutlinePanel'
import { AnnotationPanel } from './AnnotationPanel'

import 'react-pdf-highlighter-extended/dist/esm/style/TextHighlight.css'
import 'react-pdf-highlighter-extended/dist/esm/style/PdfHighlighter.css'

// 使用本地 worker 文件，避免从 unpkg.com 下载
GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs'

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

/** 可用的高亮颜色 */
export const HIGHLIGHT_COLORS = [
  { name: '黄色', value: 'rgba(255, 226, 143, 0.6)' },
  { name: '绿色', value: 'rgba(166, 227, 161, 0.6)' },
  { name: '蓝色', value: 'rgba(147, 197, 253, 0.6)' },
  { name: '粉色', value: 'rgba(249, 168, 212, 0.6)' },
  { name: '橙色', value: 'rgba(253, 186, 116, 0.6)' },
] as const

const DEFAULT_COLOR = HIGHLIGHT_COLORS[0].value
const COLOR_STORAGE_KEY = 'reader-highlight-color'

/** 将数据库批注转换为 react-pdf-highlighter-extended 的 Highlight 格式 */
interface ReaderHighlight extends Highlight {
  color: string
  comment: string
  annotationId: string
}

interface PdfReaderProps {
  bookId: string
  fileUrl: string
  canAnnotate: boolean
  bookTitle: string
  onBack: () => void
}

export function PdfReader({
  bookId,
  fileUrl,
  canAnnotate,
  bookTitle,
  onBack,
}: PdfReaderProps) {
  const {
    annotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
  } = useAnnotations(bookId)

  const highlighterUtilsRef = useRef<PdfHighlighterUtils>()
  const currentSelectionRef = useRef<PdfSelection | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState<PdfScaleValue>(1.0)
  const [activeColor, setActiveColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(COLOR_STORAGE_KEY)
      if (saved && HIGHLIGHT_COLORS.some((c) => c.value === saved)) {
        return saved
      }
    }
    return DEFAULT_COLOR
  })
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [sidePanelTab, setSidePanelTab] = useState<'annotations' | 'notes'>('annotations')
  const [isLoading, setIsLoading] = useState(true)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const pdfDocumentRef = useRef<import('pdfjs-dist').PDFDocumentProxy | null>(null)

  /** 翻页方式：scroll（滚动）、page（单屏切换） */
  const [scrollType, setScrollType] = useState<'scroll' | 'page'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reader-scroll-type')
      if (saved === 'scroll' || saved === 'page') return saved
    }
    return 'scroll'
  })

  /** 显示方式：single（单页）、double（双页） */
  const [displayMode, setDisplayMode] = useState<'single' | 'double'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reader-display-mode')
      if (saved === 'single' || saved === 'double') return saved
    }
    return 'single'
  })

  /** 切换颜色并持久化到 localStorage */
  const handleColorChange = useCallback((color: string) => {
    setActiveColor(color)
    try {
      localStorage.setItem(COLOR_STORAGE_KEY, color)
    } catch {
      // 静默处理 storage 不可用的情况
    }
  }, [])
  const [scrolledToHighlightId, setScrolledToHighlightId] = useState<
    string | null
  >(null)

  /**
   * 将数据库批注转换为 react-pdf-highlighter-extended 的 Highlight 格式
   */
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

  const handleScrollToHighlight = useCallback((id: string) => {
    const hl = highlights.find((h) => h.id === id)
    if (hl) {
      highlighterUtilsRef.current?.scrollToHighlight(hl)
      setScrolledToHighlightId(id)
    }
  }, [highlights])

  /** 所有笔记 */
  const allNotes = useMemo(() => {
    return annotations.filter((ann) => ann.type === 'note')
  }, [annotations])

  /**
   * 处理文本选中，保存选区到 currentSelectionRef
   */
  const handleSelection = useCallback(
    (selection: PdfSelection) => {
      if (!canAnnotate) return
      currentSelectionRef.current = selection
    },
    [canAnnotate]
  )

  /**
   * 创建高亮
   */
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
    } catch {
      // 静默处理错误
    }

    // 清除选中状态
    highlighterUtilsRef.current?.removeGhostHighlight()
    highlighterUtilsRef.current?.setTip(null)
    currentSelectionRef.current = null
  }, [canAnnotate, addAnnotation, activeColor])

  /**
   * 取消选区
   */
  const handleCancelSelection = useCallback(() => {
    highlighterUtilsRef.current?.removeGhostHighlight()
    highlighterUtilsRef.current?.setTip(null)
    currentSelectionRef.current = null
  }, [])

  /**
   * 上一页（双页模式一次翻两页）
   */
  const handlePrevPage = useCallback(() => {
    const step = displayMode === 'double' ? 2 : 1
    const newPage = Math.max(1, currentPage - step)
    if (newPage !== currentPage) {
      setCurrentPage(newPage)
      const viewer = highlighterUtilsRef.current?.getViewer()
      if (viewer) {
        viewer.currentPageNumber = newPage
      }
    }
  }, [currentPage, displayMode])

  /**
   * 下一页（双页模式一次翻两页）
   */
  const handleNextPage = useCallback(() => {
    const step = displayMode === 'double' ? 2 : 1
    const newPage = Math.min(totalPages, currentPage + step)
    if (newPage !== currentPage) {
      setCurrentPage(newPage)
      const viewer = highlighterUtilsRef.current?.getViewer()
      if (viewer) {
        viewer.currentPageNumber = newPage
      }
    }
  }, [currentPage, totalPages, displayMode])

  /**
   * 删除高亮批注
   */
  const handleDeleteHighlight = useCallback(
    async (highlightId: string) => {
      if (!canAnnotate) return
      try {
        await deleteAnnotation(highlightId)
      } catch {
        // 静默处理
      }
    },
    [canAnnotate, deleteAnnotation]
  )

  /**
   * 更新高亮批注的备注内容
   */
  const handleUpdateComment = useCallback(
    async (highlightId: string, comment: string) => {
      if (!canAnnotate) return
      try {
        await updateAnnotation(highlightId, { content: comment || null })
      } catch {
        // 静默处理
      }
    },
    [canAnnotate, updateAnnotation]
  )

  /**
   * 添加页面笔记
   */
  const handleAddNote = useCallback(
    async (content: string) => {
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
      } catch {
        // 静默处理
      }
    },
    [canAnnotate, addAnnotation, currentPage]
  )

  /**
   * 更新页面笔记
   */
  const handleUpdateNote = useCallback(
    async (noteId: string, content: string) => {
      if (!canAnnotate) return
      try {
        await updateAnnotation(noteId, { content: content.trim() || null })
      } catch {
        // 静默处理
      }
    },
    [canAnnotate, updateAnnotation]
  )

  /**
   * 删除页面笔记
   */
  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      if (!canAnnotate) return
      try {
        await deleteAnnotation(noteId)
      } catch {
        // 静默处理
      }
    },
    [canAnnotate, deleteAnnotation]
  )

  /**
   * 翻页
   */
  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return
      setCurrentPage(page)
      const viewer = highlighterUtilsRef.current?.getViewer()
      if (viewer) {
        viewer.currentPageNumber = page
      }
    },
    [totalPages]
  )

  /**
   * 缩放
   */
  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale)
  }, [])

  /** 获取 viewer 当前实际缩放比例（用于 toolbar 显示和步进计算） */
  const actualScale = typeof scale === 'number' ? scale
    : (highlighterUtilsRef.current?.getViewer()?.currentScale ?? 1.0)

  /**
   * 切换阅读模式
   */
  /** 应用 PDF.js viewer 的滚动和显示模式 */
  const applyViewerModes = useCallback((scroll: 'scroll' | 'page', display: 'single' | 'double') => {
    const viewer = highlighterUtilsRef.current?.getViewer()
    if (!viewer) return
    viewer.scrollMode = scroll === 'scroll' ? ScrollMode.VERTICAL : ScrollMode.PAGE
    viewer.spreadMode = display === 'double' ? SpreadMode.ODD : SpreadMode.NONE
    if (scroll === 'page' || display === 'double') {
      const fitMode = display === 'double' ? 'page-fit' : 'page-width'
      setScale(fitMode)
      // viewer 异步应用缩放后，读取实际数值同步到 toolbar
      requestAnimationFrame(() => {
        const actual = viewer.currentScale
        if (actual) setScale(actual)
      })
    }
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-900">
      {/* 工具栏 */}
      <ReaderToolbar
        bookTitle={bookTitle}
        currentPage={currentPage}
        totalPages={totalPages}
        scale={actualScale}
        canAnnotate={canAnnotate}
        activeColor={activeColor}
        sidePanelOpen={sidePanelOpen}
        onToggleSidePanel={() => setSidePanelOpen((prev) => !prev)}
        noteCount={allNotes.length}
        highlightCount={highlights.length}
        onBack={onBack}
        onPageChange={handlePageChange}
        onScaleChange={handleScaleChange}
        onColorChange={handleColorChange}
        outlineOpen={outlineOpen}
        onToggleOutline={() => setOutlineOpen((prev) => !prev)}
        scrollType={scrollType}
        displayMode={displayMode}
        onScrollTypeChange={handleScrollTypeChange}
        onDisplayModeChange={handleDisplayModeChange}
      />

      {/* 主内容区 */}
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
        <div className="relative flex-1 overflow-auto">
          {/* 加载指示器 - 始终显示直到 PDF 加载完成 */}
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900">
              <div className="flex flex-col items-center gap-4">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
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
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
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
                  <WarningCircle
                    size={32}
                    weight="duotone"
                    className="text-zinc-400"
                  />
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
                  onLoadComplete={() => setIsLoading(false)}
                  highlights={highlights}
                  pdfScaleValue={scale}
                  onSelection={canAnnotate ? handleSelection : undefined}
                  textSelectionColor={canAnnotate ? activeColor : 'transparent'}
                  utilsRef={(utils) => {
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
            <div className="absolute inset-0 z-20 group pointer-events-none">
              <div className="absolute left-0 top-0 bottom-0 w-24 flex items-center justify-start pl-3">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-3 rounded-full bg-zinc-800/40 hover:bg-zinc-800/70
                    opacity-0 group-hover:opacity-100 transition-opacity duration-300
                    disabled:opacity-0 disabled:cursor-not-allowed pointer-events-auto"
                >
                  <CaretLeft size={28} className="text-zinc-300" />
                </button>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-end pr-3">
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="p-3 rounded-full bg-zinc-800/40 hover:bg-zinc-800/70
                    opacity-0 group-hover:opacity-100 transition-opacity duration-300
                    disabled:opacity-0 disabled:cursor-not-allowed pointer-events-auto"
                >
                  <CaretRight size={28} className="text-zinc-300" />
                </button>
              </div>
            </div>
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
    </div>
  )
}

/**
 * HighlightContainer — 单个高亮的渲染容器
 *
 * 使用 react-pdf-highlighter-extended 的 Context 获取高亮数据，
 * 渲染 TextHighlight 组件并支持悬停弹出备注。
 */
function PdfHighlighterWithPages({
  pdfDocument,
  onTotalPages,
  onLoadComplete,
  children,
  ...props
}: Omit<React.ComponentProps<typeof PdfHighlighter>, 'style'> & {
  onTotalPages: (n: number) => void
  onLoadComplete?: () => void
}) {
  useEffect(() => {
    onTotalPages(pdfDocument.numPages)
    // PDF 文档已加载，通知父组件
    if (onLoadComplete) {
      onLoadComplete()
    }
  }, [pdfDocument, onTotalPages, onLoadComplete])

  return (
    <PdfHighlighter
      pdfDocument={pdfDocument}
      style={{ height: '100%', width: '100%' }}
      {...props}
    >
      {children}
    </PdfHighlighter>
  )
}

function HighlightContainer({
  canAnnotate,
  onDelete,
  onUpdateComment,
  scrolledToHighlightId,
}: {
  canAnnotate: boolean
  onDelete: (id: string) => void
  onUpdateComment: (id: string, comment: string) => void
  scrolledToHighlightId: string | null
}) {
  const { highlight, isScrolledTo } =
    useHighlightContainerContext<ReaderHighlight>()

  const highlightTip = canAnnotate
    ? {
        position: highlight.position,
        content: (
          <HighlightPopup
            highlight={highlight}
            onDelete={() => onDelete(highlight.id)}
            onUpdateComment={(comment) =>
              onUpdateComment(highlight.id, comment)
            }
          />
        ),
      }
    : highlight.comment
      ? {
          position: highlight.position,
          content: (
            <div className="rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-200 max-w-[240px] shadow-lg">
              {highlight.comment}
            </div>
          ),
        }
      : undefined

  const component = (
    <TextHighlight
      isScrolledTo={isScrolledTo || highlight.id === scrolledToHighlightId}
      highlight={highlight}
      style={{
        background: highlight.color || DEFAULT_COLOR,
      }}
    />
  )

  if (highlightTip) {
    return (
      <MonitoredHighlightContainer
        highlightTip={highlightTip}
        key={highlight.id}
      >
        {component}
      </MonitoredHighlightContainer>
    )
  }

  return component
}