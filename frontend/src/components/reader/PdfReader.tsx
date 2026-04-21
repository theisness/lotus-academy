'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import React from 'react'
import { GlobalWorkerOptions } from 'pdfjs-dist'
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
} from 'react-pdf-highlighter-extended'
import { SpinnerGap, WarningCircle } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useAnnotations } from '@/hooks/useAnnotations'
import type { AnnotationPosition } from '@/types/database'
import { ReaderToolbar } from './ReaderToolbar'
import { NotePanel } from './NotePanel'
import { SelectionTip } from './SelectionTip'
import { HighlightPopup } from './HighlightPopup'

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

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState<number>(1.0)
  const [activeColor, setActiveColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(COLOR_STORAGE_KEY)
      if (saved && HIGHLIGHT_COLORS.some((c) => c.value === saved)) {
        return saved
      }
    }
    return DEFAULT_COLOR
  })
  const [notePanelOpen, setNotePanelOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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

  /** 当前页面的笔记 */
  const currentPageNotes = useMemo(() => {
    return annotations.filter(
      (ann) => ann.type === 'note' && ann.page_number === currentPage
    )
  }, [annotations, currentPage])

  /**
   * 处理文本选中后创建高亮
   */
  const handleSelection = useCallback(
    async (selection: PdfSelection) => {
      if (!canAnnotate) return

      const ghostHighlight = selection.makeGhostHighlight()
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
    },
    [canAnnotate, addAnnotation, activeColor]
  )

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-900">
      {/* 工具栏 */}
      <ReaderToolbar
        bookTitle={bookTitle}
        currentPage={currentPage}
        totalPages={totalPages}
        scale={scale}
        canAnnotate={canAnnotate}
        activeColor={activeColor}
        notePanelOpen={notePanelOpen}
        noteCount={currentPageNotes.length}
        onBack={onBack}
        onPageChange={handlePageChange}
        onScaleChange={handleScaleChange}
        onColorChange={handleColorChange}
        onToggleNotePanel={() => setNotePanelOpen((prev) => !prev)}
      />

      {/* 主内容区 */}
      <div className="relative flex flex-1 overflow-hidden">
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
            {(pdfDocument) => (
                <PdfHighlighterWithPages
                  pdfDocument={pdfDocument}
                  onTotalPages={setTotalPages}
                  onLoadComplete={() => setIsLoading(false)}
                  highlights={highlights}
                  pdfScaleValue={scale}
                  onSelection={canAnnotate ? handleSelection : undefined}
                  textSelectionColor={canAnnotate ? activeColor : 'transparent'}
                  utilsRef={(utils) => { highlighterUtilsRef.current = utils }}
                  selectionTip={canAnnotate ? <SelectionTip activeColor={activeColor} /> : undefined}
                  onScrollAway={() => setScrolledToHighlightId(null)}
                >
                  <HighlightContainer
                    canAnnotate={canAnnotate}
                    onDelete={handleDeleteHighlight}
                    onUpdateComment={handleUpdateComment}
                    scrolledToHighlightId={scrolledToHighlightId}
                  />
                </PdfHighlighterWithPages>
            )}
          </PdfLoader>
        </div>

        {/* 笔记面板 */}
        {notePanelOpen && (
          <NotePanel
            notes={currentPageNotes}
            currentPage={currentPage}
            canAnnotate={canAnnotate}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onClose={() => setNotePanelOpen(false)}
          />
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
      style={{ height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
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
