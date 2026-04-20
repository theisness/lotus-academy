'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FolderSimplePlus,
  PencilSimple,
  Trash,
  Plus,
  Minus,
  SpinnerGap,
  ArrowLeft,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase'
import type { Book, Category } from '@/types/database'
import type { CategoryManagerProps } from '@/types/components'

/**
 * CategoryManager — 栏目分组管理窗口
 *
 * 模态弹窗，支持栏目的增删改查以及栏目内书籍的添加和移除。
 * 管理员管理公共栏目，普通用户管理个人栏目。
 * 使用 Glassmorphism 背景 + Spring 物理动效，与 BookEditDialog 风格一致。
 */

const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

export function CategoryManager({
  open,
  onClose,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shelfType,
  books,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddBookToCategory,
  onRemoveBookFromCategory,
}: CategoryManagerProps) {
  // New category input
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creating, setCreating] = useState(false)

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Book management sub-panel
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [categoryBookIds, setCategoryBookIds] = useState<string[]>([])
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const supabase = createClient()

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setNewCategoryName('')
      setEditingId(null)
      setEditingName('')
      setDeletingId(null)
      setSelectedCategory(null)
      setCategoryBookIds([])
    }
  }, [open])

  // Fetch books for selected category
  useEffect(() => {
    if (!selectedCategory) {
      setCategoryBookIds([])
      return
    }

    let cancelled = false
    setLoadingBooks(true)

    async function fetchCategoryBooks() {
      const { data, error } = await supabase
        .from('book_categories')
        .select('book_id')
        .eq('category_id', selectedCategory!.id)

      if (cancelled) return

      if (error) {
        setCategoryBookIds([])
      } else {
        setCategoryBookIds(
          (data ?? []).map((row: { book_id: string }) => row.book_id)
        )
      }
      setLoadingBooks(false)
    }

    fetchCategoryBooks()
    return () => {
      cancelled = true
    }
  }, [selectedCategory, supabase])

  // Books in the selected category
  const booksInCategory = useMemo(() => {
    return books.filter((b) => categoryBookIds.includes(b.id))
  }, [books, categoryBookIds])

  // Books not in the selected category (available to add)
  const booksNotInCategory = useMemo(() => {
    return books.filter((b) => !categoryBookIds.includes(b.id))
  }, [books, categoryBookIds])

  // --- Handlers ---

  const handleCreate = useCallback(async () => {
    const name = newCategoryName.trim()
    if (!name || creating) return

    setCreating(true)
    try {
      await onCreateCategory(name)
      setNewCategoryName('')
    } catch {
      // Error handled by parent hook
    } finally {
      setCreating(false)
    }
  }, [newCategoryName, creating, onCreateCategory])

  const handleEditStart = useCallback((category: Category) => {
    setEditingId(category.id)
    setEditingName(category.name)
  }, [])

  const handleEditSave = useCallback(async () => {
    if (!editingId || !editingName.trim()) return

    try {
      await onUpdateCategory(editingId, editingName.trim())
    } catch {
      // Error handled by parent hook
    } finally {
      setEditingId(null)
      setEditingName('')
    }
  }, [editingId, editingName, onUpdateCategory])

  const handleEditCancel = useCallback(() => {
    setEditingId(null)
    setEditingName('')
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingId || deleting) return

    setDeleting(true)
    try {
      await onDeleteCategory(deletingId)
      // If we were viewing this category's books, go back
      if (selectedCategory?.id === deletingId) {
        setSelectedCategory(null)
      }
    } catch {
      // Error handled by parent hook
    } finally {
      setDeleting(false)
      setDeletingId(null)
    }
  }, [deletingId, deleting, onDeleteCategory, selectedCategory])

  const handleAddBook = useCallback(
    async (bookId: string) => {
      if (!selectedCategory || actionLoading) return

      setActionLoading(bookId)
      try {
        await onAddBookToCategory(selectedCategory.id, bookId)
        setCategoryBookIds((prev) => [...prev, bookId])
      } catch {
        // Error handled by parent hook
      } finally {
        setActionLoading(null)
      }
    },
    [selectedCategory, actionLoading, onAddBookToCategory]
  )

  const handleRemoveBook = useCallback(
    async (bookId: string) => {
      if (!selectedCategory || actionLoading) return

      setActionLoading(bookId)
      try {
        await onRemoveBookFromCategory(selectedCategory.id, bookId)
        setCategoryBookIds((prev) => prev.filter((id) => id !== bookId))
      } catch {
        // Error handled by parent hook
      } finally {
        setActionLoading(null)
      }
    },
    [selectedCategory, actionLoading, onRemoveBookFromCategory]
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Glassmorphism backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />

          {/* Dialog panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={springTransition}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-lg rounded-2xl
              border border-[var(--color-border)]
              bg-[var(--color-surface)]
              shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)]
              overflow-hidden max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                {selectedCategory && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="rounded-lg p-1.5 text-[var(--color-text-subtle)]
                      hover:text-[var(--color-text-muted)] hover:bg-[var(--color-border-subtle)]
                      transition-colors active:scale-[0.98]"
                    aria-label="返回栏目列表"
                  >
                    <ArrowLeft size={18} weight="bold" />
                  </button>
                )}
                <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
                  {selectedCategory
                    ? `${selectedCategory.name} — 书籍管理`
                    : '栏目管理'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--color-text-subtle)]
                  hover:text-[var(--color-text-muted)] hover:bg-[var(--color-border-subtle)]
                  transition-colors active:scale-[0.98]"
                aria-label="关闭"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Content area — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <AnimatePresence mode="wait">
                {selectedCategory ? (
                  <motion.div
                    key="book-management"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={springTransition}
                  >
                    <BookManagementPanel
                      booksInCategory={booksInCategory}
                      booksNotInCategory={booksNotInCategory}
                      loadingBooks={loadingBooks}
                      actionLoading={actionLoading}
                      onAddBook={handleAddBook}
                      onRemoveBook={handleRemoveBook}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="category-list"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={springTransition}
                  >
                    <CategoryListPanel
                      categories={categories}
                      editingId={editingId}
                      editingName={editingName}
                      deletingId={deletingId}
                      deleting={deleting}
                      onEditStart={handleEditStart}
                      onEditSave={handleEditSave}
                      onEditCancel={handleEditCancel}
                      onEditNameChange={setEditingName}
                      onDeleteRequest={setDeletingId}
                      onDeleteConfirm={handleDeleteConfirm}
                      onDeleteCancel={() => setDeletingId(null)}
                      onSelectCategory={setSelectedCategory}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer — Add new category (only on category list view) */}
            {!selectedCategory && (
              <div className="shrink-0 border-t border-[var(--color-border)] px-6 py-4">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="new-category-name"
                    className="text-sm font-medium text-[var(--color-text)]"
                  >
                    新增栏目
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="new-category-name"
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreate()
                      }}
                      placeholder="输入栏目名称"
                      disabled={creating}
                      className="flex-1 rounded-lg border border-[var(--color-border)]
                        bg-[var(--color-surface)] py-2 px-3 text-sm text-[var(--color-text)]
                        placeholder:text-[var(--color-text-subtle)]
                        outline-none transition-colors
                        focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30
                        disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={!newCategoryName.trim() || creating}
                      className="inline-flex items-center gap-1.5 rounded-lg
                        bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white
                        transition-colors hover:bg-[var(--color-accent-hover)]
                        active:scale-[0.98]
                        disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creating ? (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          className="inline-flex"
                        >
                          <SpinnerGap size={16} />
                        </motion.span>
                      ) : (
                        <FolderSimplePlus size={16} weight="bold" />
                      )}
                      添加
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// --- Sub-components ---

interface CategoryListPanelProps {
  categories: Category[]
  editingId: string | null
  editingName: string
  deletingId: string | null
  deleting: boolean
  onEditStart: (category: Category) => void
  onEditSave: () => void
  onEditCancel: () => void
  onEditNameChange: (name: string) => void
  onDeleteRequest: (id: string) => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
  onSelectCategory: (category: Category) => void
}

function CategoryListPanel({
  categories,
  editingId,
  editingName,
  deletingId,
  deleting,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditNameChange,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onSelectCategory,
}: CategoryListPanelProps) {
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderSimplePlus
          size={40}
          weight="duotone"
          className="text-[var(--color-text-subtle)] mb-3"
        />
        <p className="text-sm text-[var(--color-text-muted)]">
          暂无栏目，请在下方添加
        </p>
      </div>
    )
  }

  return (
    <motion.div
      className="flex flex-col gap-1"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
      initial="hidden"
      animate="visible"
    >
      {categories.map((category) => (
        <motion.div
          key={category.id}
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: { opacity: 1, y: 0, transition: springTransition },
          }}
        >
          {/* Delete confirmation */}
          {deletingId === category.id ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-lg border border-[var(--color-error)]/30
                bg-[var(--color-error-muted)] p-3"
            >
              <p className="text-sm text-[var(--color-text)] mb-2">
                确定删除栏目「{category.name}」？此操作不可撤销。
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={onDeleteCancel}
                  disabled={deleting}
                  className="rounded-lg border border-[var(--color-border)]
                    bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium
                    text-[var(--color-text)] transition-colors
                    hover:border-[var(--color-text-subtle)]
                    active:scale-[0.98]
                    disabled:cursor-not-allowed disabled:opacity-60"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={onDeleteConfirm}
                  disabled={deleting}
                  className="inline-flex items-center gap-1 rounded-lg
                    bg-[var(--color-error)] px-3 py-1.5 text-xs font-medium text-white
                    transition-colors hover:opacity-90
                    active:scale-[0.98]
                    disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting && (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="inline-flex"
                    >
                      <SpinnerGap size={12} />
                    </motion.span>
                  )}
                  确认删除
                </button>
              </div>
            </motion.div>
          ) : editingId === category.id ? (
            /* Inline editing */
            <div className="flex items-center gap-2 rounded-lg p-2">
              <input
                type="text"
                value={editingName}
                onChange={(e) => onEditNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onEditSave()
                  if (e.key === 'Escape') onEditCancel()
                }}
                onBlur={onEditSave}
                autoFocus
                className="flex-1 rounded-lg border border-[var(--color-accent)]
                  bg-[var(--color-surface)] py-1.5 px-2.5 text-sm text-[var(--color-text)]
                  outline-none ring-1 ring-[var(--color-accent)]/30"
              />
            </div>
          ) : (
            /* Normal category row */
            <div
              className="group flex items-center gap-2 rounded-lg p-2
                hover:bg-[var(--color-border-subtle)] transition-colors"
            >
              <button
                type="button"
                onClick={() => onSelectCategory(category)}
                className="flex-1 text-left text-sm font-medium text-[var(--color-text)]
                  truncate active:scale-[0.98]"
              >
                {category.name}
              </button>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => onEditStart(category)}
                  className="rounded-lg p-1.5 text-[var(--color-text-subtle)]
                    hover:text-[var(--color-text-muted)] hover:bg-[var(--color-border)]
                    transition-colors active:scale-[0.98]"
                  aria-label={`编辑栏目 ${category.name}`}
                >
                  <PencilSimple size={14} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRequest(category.id)}
                  className="rounded-lg p-1.5 text-[var(--color-text-subtle)]
                    hover:text-[var(--color-error)] hover:bg-[var(--color-error-muted)]
                    transition-colors active:scale-[0.98]"
                  aria-label={`删除栏目 ${category.name}`}
                >
                  <Trash size={14} weight="bold" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  )
}

interface BookManagementPanelProps {
  booksInCategory: Book[]
  booksNotInCategory: Book[]
  loadingBooks: boolean
  actionLoading: string | null
  onAddBook: (bookId: string) => void
  onRemoveBook: (bookId: string) => void
}

function BookManagementPanel({
  booksInCategory,
  booksNotInCategory,
  loadingBooks,
  actionLoading,
  onAddBook,
  onRemoveBook,
}: BookManagementPanelProps) {
  if (loadingBooks) {
    return (
      <div className="flex flex-col gap-4">
        {/* Skeleton for "栏目内书籍" section */}
        <div>
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--color-border-subtle)] mb-2" />
          <div className="flex flex-col gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg p-2">
                <div className="h-4 flex-1 animate-pulse rounded bg-[var(--color-border-subtle)]" />
                <div className="h-3 w-12 shrink-0 animate-pulse rounded bg-[var(--color-border-subtle)]" />
                <div className="h-7 w-7 shrink-0 animate-pulse rounded-lg bg-[var(--color-border-subtle)]" />
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-[var(--color-border)]" />
        {/* Skeleton for "添加书籍" section */}
        <div>
          <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-border-subtle)] mb-2" />
          <div className="flex flex-col gap-1">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg p-2">
                <div className="h-4 flex-1 animate-pulse rounded bg-[var(--color-border-subtle)]" />
                <div className="h-3 w-12 shrink-0 animate-pulse rounded bg-[var(--color-border-subtle)]" />
                <div className="h-7 w-7 shrink-0 animate-pulse rounded-lg bg-[var(--color-border-subtle)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const bookListStagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const bookItemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: springTransition },
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Books in category */}
      <div>
        <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
          栏目内书籍 ({booksInCategory.length})
        </h3>
        {booksInCategory.length === 0 ? (
          <p className="text-xs text-[var(--color-text-subtle)] py-3 text-center">
            该栏目暂无书籍
          </p>
        ) : (
          <motion.div
            className="flex flex-col gap-1"
            variants={bookListStagger}
            initial="hidden"
            animate="visible"
          >
            {booksInCategory.map((book) => (
              <motion.div
                key={book.id}
                variants={bookItemVariants}
                className="flex items-center gap-2 rounded-lg p-2
                  hover:bg-[var(--color-border-subtle)] transition-colors"
              >
                <span className="flex-1 text-sm text-[var(--color-text)] truncate">
                  {book.title}
                </span>
                {book.author && (
                  <span className="shrink-0 text-xs text-[var(--color-text-subtle)]">
                    {book.author}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveBook(book.id)}
                  disabled={actionLoading === book.id}
                  className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-subtle)]
                    hover:text-[var(--color-error)] hover:bg-[var(--color-error-muted)]
                    transition-colors active:scale-[0.98]
                    disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`从栏目移除 ${book.title}`}
                >
                  {actionLoading === book.id ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="inline-flex"
                    >
                      <SpinnerGap size={14} />
                    </motion.span>
                  ) : (
                    <Minus size={14} weight="bold" />
                  )}
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--color-border)]" />

      {/* Available books to add */}
      <div>
        <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
          添加书籍 ({booksNotInCategory.length})
        </h3>
        {booksNotInCategory.length === 0 ? (
          <p className="text-xs text-[var(--color-text-subtle)] py-3 text-center">
            所有书籍已添加到该栏目
          </p>
        ) : (
          <motion.div
            className="flex flex-col gap-1"
            variants={bookListStagger}
            initial="hidden"
            animate="visible"
          >
            {booksNotInCategory.map((book) => (
              <motion.div
                key={book.id}
                variants={bookItemVariants}
                className="flex items-center gap-2 rounded-lg p-2
                  hover:bg-[var(--color-border-subtle)] transition-colors"
              >
                <span className="flex-1 text-sm text-[var(--color-text)] truncate">
                  {book.title}
                </span>
                {book.author && (
                  <span className="shrink-0 text-xs text-[var(--color-text-subtle)]">
                    {book.author}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onAddBook(book.id)}
                  disabled={actionLoading === book.id}
                  className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-subtle)]
                    hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-muted)]
                    transition-colors active:scale-[0.98]
                    disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`添加 ${book.title} 到栏目`}
                >
                  {actionLoading === book.id ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="inline-flex"
                    >
                      <SpinnerGap size={14} />
                    </motion.span>
                  ) : (
                    <Plus size={14} weight="bold" />
                  )}
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
