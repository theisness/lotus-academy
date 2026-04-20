'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlass,
  ShieldCheck,
  User as UserIcon,
  Tag,
  SpinnerGap,
  Check,
  WarningCircle,
  UsersThree,
} from '@phosphor-icons/react'
import { useUserManagement } from '@/hooks/useUserManagement'
import { useAuthContext } from '@/components/providers/AuthProvider'
import type { UserProfile } from '@/types/database'

/** Spring 动效配置 */
const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

/** 反馈消息 */
interface FeedbackMessage {
  type: 'success' | 'error'
  text: string
}

/**
 * AdminClient — 用户管理主客户端组件
 *
 * 包含 UserSearch、UserTable、RoleEditor、GroupTagEditor。
 * 管理员可查看所有用户、修改角色和分组标签。
 */
export function AdminClient() {
  const { user: currentUser } = useAuthContext()
  const { users, loading, searchUsers, updateRole, updateGroupTags } =
    useUserManagement()

  const [searchValue, setSearchValue] = useState('')
  const [editingTagsUserId, setEditingTagsUserId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)

  /** 搜索处理 */
  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value)
      searchUsers(value)
    },
    [searchUsers]
  )

  /** 角色切换 */
  const handleRoleToggle = useCallback(
    async (userId: string, currentRole: 'admin' | 'user') => {
      // Prevent self-demotion
      if (userId === currentUser?.id) {
        setFeedback({ type: 'error', text: '不能修改自己的角色' })
        setTimeout(() => setFeedback(null), 3000)
        return
      }

      const newRole = currentRole === 'admin' ? 'user' : 'admin'
      setUpdatingRoleId(userId)
      setFeedback(null)

      try {
        await updateRole(userId, newRole)
        setFeedback({
          type: 'success',
          text: `已将用户角色设置为${newRole === 'admin' ? '管理员' : '普通用户'}`,
        })
        setTimeout(() => setFeedback(null), 3000)
      } catch (err) {
        setFeedback({
          type: 'error',
          text: err instanceof Error ? err.message : '角色修改失败',
        })
      } finally {
        setUpdatingRoleId(null)
      }
    },
    [currentUser, updateRole]
  )

  /** 分组标签更新 */
  const handleTagsUpdate = useCallback(
    async (userId: string, tags: string[]) => {
      setFeedback(null)

      try {
        await updateGroupTags(userId, tags)
        setFeedback({ type: 'success', text: '分组标签已更新' })
        setTimeout(() => setFeedback(null), 3000)
      } catch (err) {
        setFeedback({
          type: 'error',
          text: err instanceof Error ? err.message : '分组标签修改失败',
        })
      }
    },
    [updateGroupTags]
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={springTransition}
            className="overflow-hidden"
          >
            <div
              className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${
                feedback.type === 'success'
                  ? 'border-[var(--color-accent)]/20 bg-[var(--color-accent-muted)]'
                  : 'border-[var(--color-error)]/20 bg-[var(--color-error-muted)]'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check size={16} weight="bold" className="text-[var(--color-accent)] shrink-0" />
              ) : (
                <WarningCircle size={16} weight="bold" className="text-[var(--color-error)] shrink-0" />
              )}
              <p
                className={`text-sm ${
                  feedback.type === 'success'
                    ? 'text-[var(--color-text)]'
                    : 'text-[var(--color-error)]'
                }`}
              >
                {feedback.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar */}
      <UserSearch value={searchValue} onChange={handleSearch} />

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[72px] rounded-lg bg-[var(--color-border-subtle)] animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-border-subtle)]">
            <UsersThree size={28} weight="duotone" className="text-[var(--color-text-subtle)]" />
          </div>
          <h3 className="text-base font-medium text-[var(--color-text)]">
            {searchValue ? '未找到匹配的用户' : '暂无用户'}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)] max-w-[36ch]">
            {searchValue
              ? '尝试使用其他关键词搜索'
              : '等待用户注册后即可在此管理'}
          </p>
        </div>
      )}

      {/* User list */}
      {!loading && users.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.05 } },
          }}
          className="flex flex-col gap-2"
        >
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              isSelf={u.id === currentUser?.id}
              isUpdatingRole={updatingRoleId === u.id}
              isEditingTags={editingTagsUserId === u.id}
              onRoleToggle={handleRoleToggle}
              onEditTags={() =>
                setEditingTagsUserId(
                  editingTagsUserId === u.id ? null : u.id
                )
              }
              onTagsUpdate={handleTagsUpdate}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}

/* ─── UserSearch ─── */

function UserSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative max-w-sm">
      <MagnifyingGlass
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索用户昵称..."
        className="w-full rounded-lg border border-[var(--color-border)]
          bg-[var(--color-surface)] py-2.5 pl-10 pr-4
          text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)]
          outline-none transition-colors
          focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30"
        aria-label="搜索用户"
      />
    </div>
  )
}

/* ─── UserRow ─── */

interface UserRowProps {
  user: UserProfile
  isSelf: boolean
  isUpdatingRole: boolean
  isEditingTags: boolean
  onRoleToggle: (userId: string, currentRole: 'admin' | 'user') => void
  onEditTags: () => void
  onTagsUpdate: (userId: string, tags: string[]) => void
}

function UserRow({
  user,
  isSelf,
  isUpdatingRole,
  isEditingTags,
  onRoleToggle,
  onEditTags,
  onTagsUpdate,
}: UserRowProps) {
  const initial = (user.nickname || user.id || '?').charAt(0).toUpperCase()

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={springTransition}
      className="rounded-lg border border-[var(--color-border-subtle)]
        bg-[var(--color-surface)] overflow-hidden"
    >
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Avatar */}
        <div
          className="h-10 w-10 shrink-0 rounded-full overflow-hidden
            bg-[var(--color-accent-muted)] flex items-center justify-center"
        >
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.nickname || '用户头像'}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-[var(--color-accent)]">
              {initial}
            </span>
          )}
        </div>

        {/* User info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[var(--color-text)] truncate">
              {user.nickname || '未设置昵称'}
            </p>
            {isSelf && (
              <span className="shrink-0 rounded-full bg-[var(--color-accent-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                你
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-subtle)] truncate mt-0.5">
            ID: {user.id.slice(0, 8)}...
          </p>
        </div>

        {/* Role badge + toggle */}
        <RoleEditor
          role={user.role}
          isSelf={isSelf}
          isUpdating={isUpdatingRole}
          onToggle={() => onRoleToggle(user.id, user.role)}
        />

        {/* Tags button */}
        <button
          type="button"
          onClick={onEditTags}
          className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5
            text-xs font-medium transition-colors active:scale-[0.98]
            ${
              isEditingTags
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-muted)]/50'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
            }`}
          aria-label="编辑分组标签"
        >
          <Tag size={14} weight="bold" />
          <span className="hidden sm:inline">
            标签{user.group_tags.length > 0 ? ` (${user.group_tags.length})` : ''}
          </span>
        </button>
      </div>

      {/* Group tags editor (expandable) */}
      <AnimatePresence>
        {isEditingTags && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springTransition}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--color-border-subtle)] px-4 py-3">
              <GroupTagEditor
                tags={user.group_tags}
                onUpdate={(tags) => onTagsUpdate(user.id, tags)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── RoleEditor ─── */

function RoleEditor({
  role,
  isSelf,
  isUpdating,
  onToggle,
}: {
  role: 'admin' | 'user'
  isSelf: boolean
  isUpdating: boolean
  onToggle: () => void
}) {
  const isAdmin = role === 'admin'

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isSelf || isUpdating}
      className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5
        text-xs font-medium transition-colors active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-60
        ${
          isAdmin
            ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
        }`}
      aria-label={`切换角色为${isAdmin ? '普通用户' : '管理员'}`}
    >
      {isUpdating ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          className="inline-flex"
        >
          <SpinnerGap size={14} />
        </motion.span>
      ) : isAdmin ? (
        <ShieldCheck size={14} weight="bold" />
      ) : (
        <UserIcon size={14} weight="regular" />
      )}
      <span className="hidden sm:inline">{isAdmin ? '管理员' : '用户'}</span>
    </button>
  )
}

/* ─── GroupTagEditor ─── */

function GroupTagEditor({
  tags,
  onUpdate,
}: {
  tags: string[]
  onUpdate: (tags: string[]) => void
}) {
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAddTag = useCallback(async () => {
    const trimmed = newTag.trim()
    if (!trimmed || tags.includes(trimmed)) {
      setNewTag('')
      return
    }

    setSaving(true)
    try {
      await onUpdate([...tags, trimmed])
      setNewTag('')
    } finally {
      setSaving(false)
    }
  }, [newTag, tags, onUpdate])

  const handleRemoveTag = useCallback(
    async (tagToRemove: string) => {
      setSaving(true)
      try {
        await onUpdate(tags.filter((t) => t !== tagToRemove))
      } finally {
        setSaving(false)
      }
    },
    [tags, onUpdate]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddTag()
      }
    },
    [handleAddTag]
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium text-[var(--color-text-muted)]">
        分组标签
      </p>

      {/* Existing tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full
                bg-[var(--color-bg)] border border-[var(--color-border)]
                px-2.5 py-1 text-xs text-[var(--color-text)]"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                disabled={saving}
                className="ml-0.5 rounded-full p-0.5
                  text-[var(--color-text-subtle)] hover:text-[var(--color-error)]
                  transition-colors disabled:opacity-60"
                aria-label={`移除标签 ${tag}`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 2L8 8M8 2L2 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {tags.length === 0 && (
        <p className="text-xs text-[var(--color-text-subtle)]">
          暂无分组标签
        </p>
      )}

      {/* Add tag input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入标签名称，回车添加"
          disabled={saving}
          className="flex-1 rounded-lg border border-[var(--color-border)]
            bg-[var(--color-surface)] py-1.5 px-3
            text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)]
            outline-none transition-colors
            focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30
            disabled:opacity-60"
          aria-label="添加分组标签"
        />
        <button
          type="button"
          onClick={handleAddTag}
          disabled={!newTag.trim() || saving}
          className="shrink-0 rounded-lg bg-[var(--color-accent)] px-3 py-1.5
            text-xs font-medium text-white
            transition-colors hover:bg-[var(--color-accent-hover)]
            disabled:cursor-not-allowed disabled:opacity-60
            active:scale-[0.98]"
        >
          {saving ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="inline-flex"
            >
              <SpinnerGap size={12} />
            </motion.span>
          ) : (
            '添加'
          )}
        </button>
      </div>
    </div>
  )
}
