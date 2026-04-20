'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  WarningCircle,
  ArrowClockwise,
  FilePdf,
  SpinnerGap,
  X,
  Check,
  Folders,
} from '@phosphor-icons/react'
import { useBooks } from '@/hooks/useBooks'
import { useCategories } from '@/hooks/useCategories'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase'
import type { Book } from '@/types/database'
import type { BookMetadata } from '@/types/common'
import { SearchBar } from './SearchBar'
import { CategoryTabs } from './CategoryTabs'
import { DisplaySettings } from './DisplaySettings'
import { BookGrid } from './BookGrid'
import { BookUploadButton } from './BookUploadButton'
import { BookEditDialog } from './BookEditDialog'
import { CategoryManager } from './CategoryManager'

/**
 * BookshelfClient — 公共书架主客户端组件
 *
 * 管理状态：活动栏目、搜索词、每行列数。
 * 协调 SearchBar、CategoryTabs、DisplaySettings、BookGrid。
 * 管理员可见上传按钮，支持上传公共书籍。
 */

const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

/** 上传流程状态 */
type UploadStep = 'idle' | 'confirm' | 'uploading' | 'success' | 'error'

/** 格式化文件大小 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 从文件名提取标题（去掉扩展名） */
function fileNameToTitle(name: string): string {
  return name.replace(/\.pdf$/i, '')
}

export function BookshelfClient() {
  const { user, isAdmin } = useAuthContext()
  const {
    books,
    loading: booksLoading,
    error: booksError,
    searchBooks,
    uploadBook,
    updateBook,
  } = useBooks('public')
  const { categories, loading: categoriesLoading, createCategory, updateCategory, deleteCategory, addBookToCategory, removeBookFromCategory } = useCategories('public')

  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [columns, setColumns] = useState(4)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)

  // Book IDs belonging to the active category
  const [categoryBookIds, setCategoryBookIds] = useState<string[] | null>(null)
  const [categoryLoading, setCategoryLoading] = useState(false)

  // Upload flow state
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadError, setUploadError] = useState('')

  // Edit dialog state
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [editingBookGroupTags, setEditingBookGroupTags] = useState<string[]>([])

  const supabase = createClient()

  // 注意：页面偏好仅影响 Navbar 默认高亮，不在此处做重定向，
  // 避免用户主动导航到公共书架时被弹回。

  // Fetch book IDs for the selected category
  useEffect(() => {
    if (!activeCategory) {
      setCategoryBookIds(null)
      setCategoryLoading(false)
      return
    }

    let cancelled = false
    setCategoryLoading(true)

    async function fetchCategoryBooks() {
      const { data, error } = await supabase
        .from('book_categories')
        .select('book_id')
        .eq('category_id', activeCategory!)

      if (cancelled) return

      if (error) {
        setCategoryBookIds([])
      } else {
        setCategoryBookIds((data ?? []).map((row: { book_id: string }) => row.book_id))
      }
      setCategoryLoading(false)
    }

    fetchCategoryBooks()
    return () => { cancelled = true }
  }, [activeCategory, supabase])

  // Filter books by category
  const filteredBooks = useMemo(() => {
    if (!categoryBookIds) return books
    return books.filter((book) => categoryBookIds.includes(book.id))
  }, [books, categoryBookIds])

  const handleSearch = useCallback(
    (query: string) => {
      setSearchValue(query)
      searchBooks(query)
    },
    [searchBooks]
  )

  const handleCategorySelect = useCallback((id: string) => {
    // CategoryTabs passes null (as string) for "全部"
    setActiveCategory(id || null)
  }, [])

  const handleBookClick = useCallback((book: Book) => {
    // Navigate to reader — placeholder for now
    window.location.href = `/reader/${book.id}`
  }, [])

  // --- Edit flow handlers (admin only for public bookshelf) ---

  const handleEditClick = useCallback((book: Book) => {
    if (!isAdmin) return
    setEditingBook(book)

    // Fetch group tags for public books
    if (book.type === 'public') {
      supabase
        .from('book_group_tags')
        .select('group_tag')
        .eq('book_id', book.id)
        .then(({ data }: { data: { group_tag: string }[] | null }) => {
          setEditingBookGroupTags(
            (data ?? []).map((row: { group_tag: string }) => row.group_tag)
          )
        })
    } else {
      setEditingBookGroupTags([])
    }
  }, [isAdmin, supabase])

  const handleEditSave = useCallback(
    async (data: Partial<BookMetadata>) => {
      if (!editingBook) return
      await updateBook(editingBook.id, data)
      setEditingBook(null)
    },
    [editingBook, updateBook]
  )

  const handleEditClose = useCallback(() => {
    setEditingBook(null)
    setEditingBookGroupTags([])
  }, [])

  const handleGroupTagsChange = useCallback(
    async (tags: string[]) => {
      if (!editingBook) return

      // Delete all existing tags for this book
      await supabase
        .from('book_group_tags')
        .delete()
        .eq('book_id', editingBook.id)

      // Insert new tags
      if (tags.length > 0) {
        await supabase.from('book_group_tags').insert(
          tags.map((tag) => ({
            book_id: editingBook.id,
            group_tag: tag,
          }))
        )
      }

      // Update local state immediately
      setEditingBookGroupTags(tags)
    },
    [editingBook, supabase]
  )

  // --- Upload flow handlers (admin only) ---

  const handleFileSelected = useCallback((file: File) => {
    // Non-admin permission check
    if (!isAdmin) {
      setUploadError('权限不足：仅管理员可上传公共书籍')
      setUploadStep('error')
      return
    }

    // Validate PDF
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('仅支持 PDF 格式文件')
      setUploadStep('error')
      return
    }

    setSelectedFile(file)
    setUploadTitle(fileNameToTitle(file.name))
    setUploadError('')
    setUploadStep('confirm')
  }, [isAdmin])

  const handleUploadConfirm = useCallback(async () => {
    if (!selectedFile || !uploadTitle.trim()) return

    // Double-check admin permission before upload
    if (!isAdmin) {
      setUploadError('权限不足：仅管理员可上传公共书籍')
      setUploadStep('error')
      return
    }

    setUploadStep('uploading')
    setUploadError('')

    try {
      await uploadBook(selectedFile, {
        title: uploadTitle.trim(),
        author: '',
        description: '',
        cover_url: '',
        published_date: new Date().toISOString().split('T')[0],
      })
      setUploadStep('success')

      // Auto-dismiss success after 2 seconds
      setTimeout(() => {
        setUploadStep('idle')
        setSelectedFile(null)
        setUploadTitle('')
      }, 2000)
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : '上传失败，请重试'
      )
      setUploadStep('error')
    }
  }, [selectedFile, uploadTitle, uploadBook, isAdmin])

  const handleUploadCancel = useCallback(() => {
    setUploadStep('idle')
    setSelectedFile(null)
    setUploadTitle('')
    setUploadError('')
  }, [])

  const isLoading = booksLoading || categoriesLoading || categoryLoading

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springTransition}
      className="py-6 md:py-8"
    >
      {/* Header row: search + upload (admin) + display settings */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
        <div className="flex-1 w-full sm:max-w-sm">
          <SearchBar
            value={searchValue}
            onChange={handleSearch}
            placeholder="搜索书籍名称..."
          />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {isAdmin && (
            <BookUploadButton shelfType="public" onUpload={handleFileSelected} />
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setCategoryManagerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg
                border border-[var(--color-border)] bg-[var(--color-surface)]
                text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                hover:border-[var(--color-accent)] transition-colors active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              aria-label="栏目管理"
            >
              <Folders size={18} weight="regular" />
            </button>
          )}
          <DisplaySettings columns={columns} onChange={setColumns} />
        </div>
      </div>

      {/* Upload overlay (admin only) */}
      <AnimatePresence>
        {uploadStep !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={springTransition}
            className="mb-5 overflow-hidden"
          >
            <div
              className="rounded-lg border border-[var(--color-border)]
                bg-[var(--color-surface)] p-4"
            >
              {/* Confirm step */}
              {uploadStep === 'confirm' && selectedFile && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-error-muted)]">
                      <FilePdf
                        size={22}
                        weight="duotone"
                        className="text-[var(--color-error)]"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUploadCancel}
                      className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-subtle)]
                        hover:text-[var(--color-text-muted)] hover:bg-[var(--color-border-subtle)]
                        transition-colors active:scale-[0.98]"
                      aria-label="取消上传"
                    >
                      <X size={16} weight="bold" />
                    </button>
                  </div>

                  {/* Title input */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="upload-title"
                      className="text-sm font-medium text-[var(--color-text)]"
                    >
                      书籍标题
                    </label>
                    <input
                      id="upload-title"
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="输入书籍标题"
                      className="w-full rounded-lg border border-[var(--color-border)]
                        bg-[var(--color-surface)] py-2 px-3 text-sm text-[var(--color-text)]
                        placeholder:text-[var(--color-text-subtle)]
                        outline-none transition-colors
                        focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30"
                    />
                  </div>

                  {/* Confirm button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleUploadConfirm}
                      disabled={!uploadTitle.trim()}
                      className="inline-flex items-center gap-2 rounded-lg
                        bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white
                        transition-colors hover:bg-[var(--color-accent-hover)]
                        disabled:cursor-not-allowed disabled:opacity-60
                        active:scale-[0.98]"
                    >
                      确认上传
                    </button>
                  </div>
                </div>
              )}

              {/* Uploading step */}
              {uploadStep === 'uploading' && (
                <div className="flex items-center gap-3 py-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="inline-flex text-[var(--color-accent)]"
                  >
                    <SpinnerGap size={20} />
                  </motion.span>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    正在上传...
                  </p>
                </div>
              )}

              {/* Success step */}
              {uploadStep === 'success' && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent-muted)]">
                    <Check
                      size={14}
                      weight="bold"
                      className="text-[var(--color-accent)]"
                    />
                  </div>
                  <p className="text-sm text-[var(--color-text)]">
                    上传成功
                  </p>
                </div>
              )}

              {/* Error step */}
              {uploadStep === 'error' && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-error-muted)]">
                    <WarningCircle
                      size={14}
                      weight="bold"
                      className="text-[var(--color-error)]"
                    />
                  </div>
                  <p className="flex-1 text-sm text-[var(--color-error)]">
                    {uploadError || '上传失败'}
                  </p>
                  <button
                    type="button"
                    onClick={handleUploadCancel}
                    className="shrink-0 text-sm font-medium text-[var(--color-text-muted)]
                      hover:text-[var(--color-text)] transition-colors active:scale-[0.98]"
                  >
                    关闭
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category tabs */}
      <div className="mb-5 sm:mb-6 rounded-lg bg-[var(--color-bg)] p-1 -mx-1 sm:mx-0">
        <CategoryTabs
          categories={categories}
          activeId={activeCategory}
          onSelect={handleCategorySelect}
        />
      </div>

      {/* Error state */}
      {booksError && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-error-muted)]">
            <WarningCircle size={28} weight="duotone" className="text-[var(--color-error)]" />
          </div>
          <h3 className="text-base font-medium text-[var(--color-text)]">
            加载失败
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)] max-w-[36ch]">
            {booksError.message || '无法获取书籍列表，请稍后重试'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg
              border border-[var(--color-border)] bg-[var(--color-surface)]
              px-4 py-2 text-sm font-medium text-[var(--color-text)]
              hover:border-[var(--color-accent)] transition-colors active:scale-[0.98]"
          >
            <ArrowClockwise size={16} weight="regular" />
            重新加载
          </button>
        </div>
      )}

      {/* Book grid */}
      {!booksError && (
        <BookGrid
          books={filteredBooks}
          columns={columns}
          loading={isLoading}
          onBookClick={handleBookClick}
          onEditClick={isAdmin ? handleEditClick : undefined}
        />
      )}

      {/* Book edit dialog (admin only) */}
      {editingBook && (
        <BookEditDialog
          book={editingBook}
          open={!!editingBook}
          onClose={handleEditClose}
          onSave={handleEditSave}
          groupTags={editingBook.type === 'public' ? editingBookGroupTags : undefined}
          onGroupTagsChange={editingBook.type === 'public' ? handleGroupTagsChange : undefined}
        />
      )}

      {/* Category manager dialog (admin only) */}
      {isAdmin && (
        <CategoryManager
          open={categoryManagerOpen}
          onClose={() => setCategoryManagerOpen(false)}
          shelfType="public"
          books={books}
          categories={categories}
          onCreateCategory={createCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
          onAddBookToCategory={addBookToCategory}
          onRemoveBookFromCategory={removeBookFromCategory}
        />
      )}
    </motion.div>
  )
}
