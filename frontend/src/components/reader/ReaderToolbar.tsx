'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  CaretLeft,
  CaretRight,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Palette,
  NotePencil,
  Check,
  DotsThree,
  BookOpenText,
  BookOpen,
  Columns,
} from '@phosphor-icons/react'
import { HIGHLIGHT_COLORS } from './PdfReader'

/**
 * ReaderToolbar — 阅读器工具栏
 *
 * 提供：
 * - 返回按钮 + 书籍标题
 * - 翻页控制（上一页/下一页/页码跳转）
 * - 翻页模式切换（滚动/单页/双页）
 * - 缩放控制（缩小/放大）
 * - 批注工具（颜色选择器，仅 canAnnotate 时显示）
 * - 笔记面板切换按钮
 *
 * 移动端适配：
 * - 缩放控制折叠到溢出菜单中
 * - 更紧凑的间距
 */

const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

interface ReaderToolbarProps {
  bookTitle: string
  currentPage: number
  totalPages: number
  scale: number
  canAnnotate: boolean
  activeColor: string
  notePanelOpen: boolean
  noteCount: number
  onBack: () => void
  onPageChange: (page: number) => void
  onScaleChange: (scale: number) => void
  onColorChange: (color: string) => void
  onToggleNotePanel: () => void
  viewMode: 'scroll' | 'single' | 'spread'
  onViewModeChange: (mode: 'scroll' | 'single' | 'spread') => void
}

const SCALE_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

export function ReaderToolbar({
  bookTitle,
  currentPage,
  totalPages,
  scale,
  canAnnotate,
  activeColor,
  notePanelOpen,
  noteCount,
  onBack,
  onPageChange,
  onScaleChange,
  onColorChange,
  onToggleNotePanel,
  viewMode,
  onViewModeChange,
}: ReaderToolbarProps) {
  const [pageInput, setPageInput] = useState(String(currentPage))
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [mobileOverflowOpen, setMobileOverflowOpen] = useState(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const overflowRef = useRef<HTMLDivElement>(null)

  // 同步页码输入
  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

  // 点击外部关闭颜色选择器
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setColorPickerOpen(false)
      }
    }
    if (colorPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [colorPickerOpen])

  // 点击外部关闭溢出菜单
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        overflowRef.current &&
        !overflowRef.current.contains(e.target as Node)
      ) {
        setMobileOverflowOpen(false)
      }
    }
    if (mobileOverflowOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileOverflowOpen])

  const handlePageInputSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const page = parseInt(pageInput, 10)
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        onPageChange(page)
      } else {
        setPageInput(String(currentPage))
      }
    },
    [pageInput, totalPages, currentPage, onPageChange]
  )

  const handleZoomIn = useCallback(() => {
    const nextStep = SCALE_STEPS.find((s) => s > scale)
    if (nextStep) onScaleChange(nextStep)
  }, [scale, onScaleChange])

  const handleZoomOut = useCallback(() => {
    const prevStep = [...SCALE_STEPS].reverse().find((s) => s < scale)
    if (prevStep) onScaleChange(prevStep)
  }, [scale, onScaleChange])

  return (
    <div
      className="relative z-[60] flex h-12 shrink-0 items-center justify-between
        border-b border-zinc-700/50 bg-zinc-900/95 backdrop-blur-sm px-2 sm:px-3 gap-1 sm:gap-2"
    >
      {/* 左侧：返回 + 标题 */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-shrink">
        <button
          onClick={onBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
            text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
            transition-colors active:scale-[0.98]"
          aria-label="返回书架"
        >
          <ArrowLeft size={18} weight="regular" />
        </button>
        <span className="text-sm font-medium text-zinc-300 truncate max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
          {bookTitle}
        </span>
      </div>

      {/* 中间：翻页 + 翻页模式 + 缩放 */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {/* 翻页 */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg
            text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors active:scale-[0.98]"
          aria-label="上一页"
        >
          <CaretLeft size={16} weight="bold" />
        </button>

        <form
          onSubmit={handlePageInputSubmit}
          className="flex items-center gap-1"
        >
          <input
            type="text"
            inputMode="numeric"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={handlePageInputSubmit}
            className="w-9 sm:w-10 rounded-md bg-zinc-800 border border-zinc-700
              text-center text-xs text-zinc-200 py-1
              outline-none focus:border-[var(--color-accent)]
              transition-colors"
            aria-label="当前页码"
          />
          <span className="text-xs text-zinc-500">/</span>
          <span className="text-xs text-zinc-400 tabular-nums">
            {totalPages || '—'}
          </span>
        </form>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg
            text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors active:scale-[0.98]"
          aria-label="下一页"
        >
          <CaretRight size={16} weight="bold" />
        </button>

        {/* 翻页模式切换 — 仅桌面端显示 */}
        <div className="hidden sm:flex items-center gap-0.5">
          <div className="mx-1 h-5 w-px bg-zinc-700" />
          <button
            onClick={() => onViewModeChange('scroll')}
            className={`flex h-8 w-8 items-center justify-center rounded-lg
              transition-colors active:scale-[0.98]
              ${viewMode === 'scroll' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
            aria-label="滚动模式"
            title="滚动"
          >
            <BookOpenText size={16} weight={viewMode === 'scroll' ? 'fill' : 'regular'} />
          </button>
          <button
            onClick={() => onViewModeChange('single')}
            className={`flex h-8 w-8 items-center justify-center rounded-lg
              transition-colors active:scale-[0.98]
              ${viewMode === 'single' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
            aria-label="单页模式"
            title="单页"
          >
            <BookOpen size={16} weight={viewMode === 'single' ? 'fill' : 'regular'} />
          </button>
          <button
            onClick={() => onViewModeChange('spread')}
            className={`flex h-8 w-8 items-center justify-center rounded-lg
              transition-colors active:scale-[0.98]
              ${viewMode === 'spread' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
            aria-label="双页模式"
            title="双页"
          >
            <Columns size={16} weight={viewMode === 'spread' ? 'fill' : 'regular'} />
          </button>
        </div>

        {/* 缩放控制 — 仅桌面端显示 */}
        <div className="hidden sm:flex items-center gap-1">
          <div className="mx-1 h-5 w-px bg-zinc-700" />

          <button
            onClick={handleZoomOut}
            disabled={scale <= SCALE_STEPS[0]}
            className="flex h-8 w-8 items-center justify-center rounded-lg
              text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors active:scale-[0.98]"
            aria-label="缩小"
          >
            <MagnifyingGlassMinus size={16} weight="regular" />
          </button>
          <span className="text-xs text-zinc-400 tabular-nums w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={scale >= SCALE_STEPS[SCALE_STEPS.length - 1]}
            className="flex h-8 w-8 items-center justify-center rounded-lg
              text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors active:scale-[0.98]"
            aria-label="放大"
          >
            <MagnifyingGlassPlus size={16} weight="regular" />
          </button>
        </div>
      </div>

      {/* 右侧：批注工具 + 笔记 + 移动端溢出菜单 */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {/* 颜色选择器（仅 canAnnotate 时显示） */}
        {canAnnotate && (
          <div className="relative" ref={colorPickerRef}>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setColorPickerOpen((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-lg
                text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
                transition-colors active:scale-[0.98]"
              aria-label="选择高亮颜色"
            >
              <div className="relative">
                <Palette size={18} weight="regular" />
                <div
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-zinc-800"
                  style={{ backgroundColor: activeColor }}
                />
              </div>
            </button>

            <AnimatePresence>
              {colorPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={springTransition}
                  className="absolute right-0 top-full mt-1 z-50
                    flex items-center gap-1.5 rounded-lg
                    bg-zinc-800 border border-zinc-700 p-2 shadow-xl"
                >
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => {
                        onColorChange(color.value)
                        setColorPickerOpen(false)
                      }}
                      className="relative flex h-7 w-7 items-center justify-center rounded-full
                        transition-transform hover:scale-110 active:scale-95"
                      style={{ backgroundColor: color.value }}
                      aria-label={color.name}
                    >
                      {activeColor === color.value && (
                        <Check
                          size={12}
                          weight="bold"
                          className="text-zinc-800"
                        />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 笔记面板切换 */}
        <button
          onClick={onToggleNotePanel}
          className={`relative flex h-8 w-8 items-center justify-center rounded-lg
            transition-colors active:scale-[0.98]
            ${
              notePanelOpen
                ? 'bg-zinc-700 text-zinc-200'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          aria-label="笔记面板"
        >
          <NotePencil size={18} weight="regular" />
          {noteCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 15,
              }}
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center
                rounded-full bg-[var(--color-accent)] px-1
                text-[10px] font-medium text-white"
            >
              {noteCount}
            </motion.span>
          )}
        </button>

        {/* 移动端溢出菜单（缩放控制 + 翻页模式） */}
        <div className="relative sm:hidden" ref={overflowRef}>
          <button
            onClick={() => setMobileOverflowOpen((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center rounded-lg
              text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
              transition-colors active:scale-[0.98]"
            aria-label="更多工具"
          >
            <DotsThree size={20} weight="bold" />
          </button>

          <AnimatePresence>
            {mobileOverflowOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={springTransition}
                className="absolute right-0 top-full mt-1 z-50
                  rounded-lg bg-zinc-800 border border-zinc-700 p-3 shadow-xl
                  min-w-[180px]"
              >
                {/* 翻页模式 */}
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-2">
                  翻页模式
                </p>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <button
                    onClick={() => onViewModeChange('scroll')}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg
                      transition-colors active:scale-[0.98]
                      ${viewMode === 'scroll' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'}`}
                    aria-label="滚动模式"
                  >
                    <BookOpenText size={16} weight={viewMode === 'scroll' ? 'fill' : 'regular'} />
                  </button>
                  <button
                    onClick={() => onViewModeChange('single')}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg
                      transition-colors active:scale-[0.98]
                      ${viewMode === 'single' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'}`}
                    aria-label="单页模式"
                  >
                    <BookOpen size={16} weight={viewMode === 'single' ? 'fill' : 'regular'} />
                  </button>
                  <button
                    onClick={() => onViewModeChange('spread')}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg
                      transition-colors active:scale-[0.98]
                      ${viewMode === 'spread' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'}`}
                    aria-label="双页模式"
                  >
                    <Columns size={16} weight={viewMode === 'spread' ? 'fill' : 'regular'} />
                  </button>
                </div>

                {/* 缩放控制 */}
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-2">
                  缩放
                </p>
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={handleZoomOut}
                    disabled={scale <= SCALE_STEPS[0]}
                    className="flex h-8 w-8 items-center justify-center rounded-lg
                      text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-colors active:scale-[0.98]"
                    aria-label="缩小"
                  >
                    <MagnifyingGlassMinus size={16} weight="regular" />
                  </button>
                  <span className="text-xs text-zinc-300 tabular-nums flex-1 text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={scale >= SCALE_STEPS[SCALE_STEPS.length - 1]}
                    className="flex h-8 w-8 items-center justify-center rounded-lg
                      text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-colors active:scale-[0.98]"
                    aria-label="放大"
                  >
                    <MagnifyingGlassPlus size={16} weight="regular" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
