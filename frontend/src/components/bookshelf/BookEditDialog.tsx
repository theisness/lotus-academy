'use client'

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FloppyDisk,
  SpinnerGap,
  Tag,
  Plus,
  UploadSimple,
  Image as ImageIcon,
  Trash,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase'
import type { BookEditDialogProps } from '@/types/components'
import type { BookMetadata } from '@/types/common'

/**
 * BookEditDialog — 书籍信息编辑弹窗
 *
 * 模态覆盖层，包含封面上传、标题、作者、发布日期、描述字段。
 * 公共书籍额外显示分组标签可见性设置区域。
 * 封面图片上传到 Supabase Storage 的 books bucket 下 covers/ 目录。
 */

const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

/** 允许的图片类型 */
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_COVER_SIZE = 5 * 1024 * 1024 // 5MB

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
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverError, setCoverError] = useState('')
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  const coverInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // 当 book 改变时重置状态
  useEffect(() => {
    if (open) {
      setCoverUrl(book.cover_url ?? '')
      setTitle(book.title)
      setAuthor(book.author ?? '')
      setPublishedDate(book.published_date ?? '')
      setDescription(book.description ?? '')
      setCoverPreview(null)
      setCoverError('')
      setTagInput('')
      setTagSuggestions([])
      setShowTagSuggestions(false)
    }
  }, [book, open])

  const isPublicBook = book.type === 'public'
  const showGroupTags = isPublicBook && onGroupTagsChange !== undefined

  /** 当前显示的封面：优先本地预览，其次已有 URL */
  const displayCover = coverPreview || coverUrl

  /**
   * 上传封面图片到 Storage
   */
  const handleCoverSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // 重置 input 以便重复选择同一文件
      if (coverInputRef.current) coverInputRef.current.value = ''

      // 校验类型
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setCoverError('仅支持 JPG、PNG、WebP、GIF 格式')
        return
      }

      // 校验大小
      if (file.size > MAX_COVER_SIZE) {
        setCoverError('封面图片不能超过 5MB')
        return
      }

      setCoverError('')
      setCoverUploading(true)

      // 本地预览
      const localUrl = URL.createObjectURL(file)
      setCoverPreview(localUrl)

      try {
        const ext = file.name.split('.').pop() || 'jpg'
        const filePath = `covers/${book.id}_${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('books')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: true,
          })

        if (uploadError) {
          throw new Error(uploadError.message)
        }

        // 获取公开 URL
        const { data: urlData } = supabase.storage
          .from('books')
          .getPublicUrl(filePath)

        setCoverUrl(urlData.publicUrl)
        setCoverError('')
      } catch (err) {
        setCoverError(err instanceof Error ? err.message : '封面上传失败')
        setCoverPreview(null)
      } finally {
        setCoverUploading(false)
      }
    },
    [supabase, book.id]
  )

  /** 移除封面 */
  const handleRemoveCover = useCallback(() => {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverPreview(null)
    setCoverUrl('')
    setCoverError('')
  }, [coverPreview])

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
      console.log('[BookEditDialog] Calling onSave with:', data)
      await onSave(data)
      console.log('[BookEditDialog] onSave completed')
    } catch (error) {
      console.error('[BookEditDialog] Save error:', error)
      // 保持对话框打开，让用户可以重试
      // 可以考虑显示错误提示
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

  // Fetch tag suggestions based on input
  const handleTagInputChange = useCallback(
    async (value: string) => {
      setTagInput(value)
      
      if (!value.trim()) {
        setTagSuggestions([])
        setShowTagSuggestions(false)
        return
      }

      // Search for existing group tags
      const { data } = await supabase
        .from('book_group_tags')
        .select('group_tag')
        .ilike('group_tag', `%${value.trim()}%`)
        .limit(5)

      if (data && data.length > 0) {
        // Get unique tags
        const uniqueTags = [...new Set(data.map((row: { group_tag: string }) => row.group_tag))] as string[]
        // Filter out already selected tags
        const filtered = uniqueTags.filter((tag) => !groupTags?.includes(tag))
        setTagSuggestions(filtered)
        setShowTagSuggestions(filtered.length > 0)
      } else {
        setTagSuggestions([])
        setShowTagSuggestions(false)
      }
    },
    [supabase, groupTags]
  )

  const handleSelectTagSuggestion = useCallback(
    (tag: string) => {
      if (!groupTags || !onGroupTagsChange) return
      if (!groupTags.includes(tag)) {
        onGroupTagsChange([...groupTags, tag])
      }
      setTagInput('')
      setTagSuggestions([])
      setShowTagSuggestions(false)
    },
    [groupTags, onGroupTagsChange]
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
              {/* 封面上传 */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  封面图片
                </label>

                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleCoverSelect}
                  className="hidden"
                  aria-hidden="true"
                />

                {displayCover ? (
                  /* 封面预览 */
                  <div className="relative group w-full">
                    <div
                      className="relative w-full rounded-lg overflow-hidden border
                        border-[var(--color-border)] bg-[var(--color-border-subtle)]"
                      style={{ aspectRatio: '3 / 4', maxHeight: '200px', width: 'auto', margin: '0 auto' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayCover}
                        alt="封面预览"
                        className="w-full h-full object-cover"
                      />
                      {coverUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                            className="text-white"
                          >
                            <SpinnerGap size={24} />
                          </motion.span>
                        </div>
                      )}
                    </div>
                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={saving || coverUploading}
                        className="flex-1 inline-flex items-center justify-center gap-1.5
                          rounded-lg border border-[var(--color-border)]
                          bg-[var(--color-surface)] py-1.5 px-3
                          text-xs font-medium text-[var(--color-text-muted)]
                          hover:text-[var(--color-text)] hover:border-[var(--color-accent)]
                          transition-colors active:scale-[0.98]
                          disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <UploadSimple size={14} weight="bold" />
                        更换封面
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveCover}
                        disabled={saving || coverUploading}
                        className="inline-flex items-center justify-center gap-1.5
                          rounded-lg border border-[var(--color-border)]
                          bg-[var(--color-surface)] py-1.5 px-3
                          text-xs font-medium text-[var(--color-error)]
                          hover:border-[var(--color-error)] transition-colors
                          active:scale-[0.98]
                          disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash size={14} weight="bold" />
                        移除
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 上传占位区域 */
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={saving || coverUploading}
                    className="flex flex-col items-center justify-center gap-2
                      w-full rounded-lg border-2 border-dashed border-[var(--color-border)]
                      bg-[var(--color-border-subtle)]/30 py-8
                      text-[var(--color-text-subtle)]
                      hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]
                      transition-colors cursor-pointer
                      disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {coverUploading ? (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      >
                        <SpinnerGap size={24} />
                      </motion.span>
                    ) : (
                      <ImageIcon size={24} weight="duotone" />
                    )}
                    <span className="text-xs font-medium">
                      {coverUploading ? '上传中...' : '点击上传封面图片'}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-subtle)]">
                      支持 JPG、PNG、WebP、GIF，最大 5MB
                    </span>
                  </button>
                )}

                {coverError && (
                  <p className="text-xs text-[var(--color-error)]">{coverError}</p>
                )}
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
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => handleTagInputChange(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                        onFocus={() => tagSuggestions.length > 0 && setShowTagSuggestions(true)}
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

                    {/* Tag suggestions dropdown */}
                    {showTagSuggestions && tagSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-12 mt-1 z-10
                        rounded-lg border border-[var(--color-border)]
                        bg-[var(--color-surface)] shadow-lg overflow-hidden">
                        {tagSuggestions.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleSelectTagSuggestion(tag)}
                            className="w-full px-3 py-2 text-left text-sm text-[var(--color-text)]
                              hover:bg-[var(--color-accent-muted)] hover:text-[var(--color-accent)]
                              transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
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
                disabled={saving || coverUploading || !title.trim()}
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
