'use client'

import { useState, useCallback, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FloppyDisk, SpinnerGap, Tag, Plus } from '@phosphor-icons/react'
import type { BookEditDialogProps } from '@/types/components'
import type { BookMetadata } from '@/types/common'

/**
 * BookEditDialog — 书籍信息编辑弹窗
 *
 * 模态覆盖层，包含封面 URL、标题、作者、发布日期、描述字段。
 * 公共书籍额外显示分组标签可见性设置区域。
 * 使用 Framer Motion Spring 物理动效实现入场/退场动画。
 * Glassmorphism 背景：backdrop-blur-xl + 半透明遮罩。
 */

const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

export function BookEditDialog({
  book,
  open,
  onClose,
  onSave,
  groupTags,
  onGroupTagsChange,
}: BookEditDialogProps) {
  const [coverUrl, setCoverUrl] = useState(book.cover_url ?? '')
  const [title, setTitle] = useState(book.title)
  const [author, setAuthor] = useState(book.author ?? '')
  const [publishedDate, setPublishedDate] = useState(book.published_date ?? '')
  const [description, setDescription] = useState(book.description ?? '')
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const isPublicBook = book.type === 'public'
  const showGroupTags = isPublicBook && onGroupTagsChange !== undefined

  const handleSave = useCallback(async () => {
    if (!title.trim()) return

    setSaving(true)
    try {
      const data: Partial<BookMetadata> = {
        title: title.trim(),
        author: author.trim(),
        cover_url: coverUrl.trim(),
        published_date: publishedDate.trim(),
        description: description.trim(),
      }
      await onSave(data)
    } finally {
      setSaving(false)
    }
  }, [title, author, coverUrl, publishedDate, description, onSave])

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim()
    if (!tag || !groupTags || !onGroupTagsChange) return
    if (groupTags.includes(tag)) {
      setTagInput('')
      return
    }
    onGroupTagsChange([...groupTags, tag])
    setTagInput('')
  }, [tagInput, groupTags, onGroupTagsChange])

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      if (!groupTags || !onGroupTagsChange) return
      onGroupTagsChange(groupTags.filter((t) => t !== tagToRemove))
    },
    [groupTags, onGroupTagsChange]
  )

  const handleTagInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddTag()
      }
    },
    [handleAddTag]
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
              overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
                编辑书籍信息
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg p-1.5 text-[var(--color-text-subtle)]
                  hover:text-[var(--color-text-muted)] hover:bg-[var(--color-border-subtle)]
                  transition-colors active:scale-[0.98]
                  disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="关闭"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-4 px-6 py-4">
              {/* 封面 URL */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="edit-cover-url"
                  className="text-sm font-medium text-[var(--color-text)]"
                >
                  封面 URL
                </label>
                <input
                  id="edit-cover-url"
                  type="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  disabled={saving}
                  className="w-full rounded-lg border border-[var(--color-border)]
                    bg-[var(--color-surface)] py-2 px-3 text-sm text-[var(--color-text)]
                    placeholder:text-[var(--color-text-subtle)]
                    outline-none transition-colors
                    focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30
                    disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* 标题 */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="edit-title"
                  className="text-sm font-medium text-[var(--color-text)]"
                >
                  标题
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入书籍标题"
                  disabled={saving}
                  className="w-full rounded-lg border border-[var(--color-border)]
                    bg-[var(--color-surface)] py-2 px-3 text-sm text-[var(--color-text)]
                    placeholder:text-[var(--color-text-subtle)]
                    outline-none transition-colors
                    focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30
                    disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* 作者 */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="edit-author"
                  className="text-sm font-medium text-[var(--color-text)]"
                >
                  作者
                </label>
                <input
                  id="edit-author"
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="输入作者名称"
                  disabled={saving}
                  className="w-full rounded-lg border border-[var(--color-border)]
                    bg-[var(--color-surface)] py-2 px-3 text-sm text-[var(--color-text)]
                    placeholder:text-[var(--color-text-subtle)]
                    outline-none transition-colors
                    focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30
                    disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* 发布日期 */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="edit-published-date"
                  className="text-sm font-medium text-[var(--color-text)]"
                >
                  发布日期
                </label>
                <input
                  id="edit-published-date"
                  type="date"
                  value={publishedDate}
                  onChange={(e) => setPublishedDate(e.target.value)}
                  disabled={saving}
                  className="w-full rounded-lg border border-[var(--color-border)]
                    bg-[var(--color-surface)] py-2 px-3 text-sm text-[var(--color-text)]
                    placeholder:text-[var(--color-text-subtle)]
                    outline-none transition-colors
                    focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30
                    disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* 描述 */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="edit-description"
                  className="text-sm font-medium text-[var(--color-text)]"
                >
                  描述
                </label>
                <textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="输入书籍描述"
                  rows={3}
                  disabled={saving}
                  className="w-full rounded-lg border border-[var(--color-border)]
                    bg-[var(--color-surface)] py-2 px-3 text-sm text-[var(--color-text)]
                    placeholder:text-[var(--color-text-subtle)]
                    outline-none transition-colors resize-none
                    focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30
                    disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            {/* Group tag visibility section — only for public books */}
            {showGroupTags && (
              <div className="px-6 pb-4">
                <div className="border-t border-[var(--color-border)] pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag
                      size={16}
                      weight="bold"
                      className="text-[var(--color-accent)]"
                    />
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      可见性设置
                    </span>
                  </div>

                  <p className="text-xs text-[var(--color-text-subtle)] mb-3">
                    未设置分组标签时，所有用户均可查看此书籍
                  </p>

                  {/* Current tags */}
                  {groupTags && groupTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {groupTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full
                            bg-[var(--color-accent-muted)] px-2.5 py-1
                            text-xs font-medium text-[var(--color-accent-hover)]"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="rounded-full p-0.5
                              hover:bg-[var(--color-accent)]/10
                              transition-colors active:scale-[0.98]"
                            aria-label={`移除标签 ${tag}`}
                          >
                            <X size={12} weight="bold" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add tag input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder="输入分组标签名称，按回车添加"
                      className="flex-1 rounded-lg border border-[var(--color-border)]
                        bg-[var(--color-surface)] py-1.5 px-3 text-sm text-[var(--color-text)]
                        placeholder:text-[var(--color-text-subtle)]
                        outline-none transition-colors
                        focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      disabled={!tagInput.trim()}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                        border border-[var(--color-border)] bg-[var(--color-surface)]
                        text-[var(--color-text-muted)] hover:text-[var(--color-accent)]
                        hover:border-[var(--color-accent)] transition-colors active:scale-[0.98]
                        disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="添加标签"
                    >
                      <Plus size={14} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg border border-[var(--color-border)]
                  bg-[var(--color-surface)] px-4 py-2 text-sm font-medium
                  text-[var(--color-text)] transition-colors
                  hover:border-[var(--color-text-subtle)]
                  active:scale-[0.98]
                  disabled:cursor-not-allowed disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="inline-flex items-center gap-2 rounded-lg
                  bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white
                  transition-colors hover:bg-[var(--color-accent-hover)]
                  active:scale-[0.98]
                  disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="inline-flex"
                  >
                    <SpinnerGap size={16} />
                  </motion.span>
                ) : (
                  <FloppyDisk size={16} weight="bold" />
                )}
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
