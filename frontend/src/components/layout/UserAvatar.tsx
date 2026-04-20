'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Info, SignOut, UsersThree } from '@phosphor-icons/react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { AboutDialog } from './AboutDialog'

/**
 * UserAvatar — 用户头像组件
 *
 * 显示用户头像（或昵称/邮箱首字母作为 fallback），
 * 点击弹出下拉菜单：个人信息、关于、退出登录。
 */
export function UserAvatar() {
  const { user, isAdmin, signOut } = useAuthContext()
  const [open, setOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (!user) return null

  const displayName = user.nickname || user.id
  const initial = (user.nickname || user.id || '?').charAt(0).toUpperCase()

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-full
          bg-[var(--color-accent-muted)] text-[var(--color-accent)]
          text-sm font-medium transition-transform active:scale-[0.98]
          hover:ring-2 hover:ring-[var(--color-accent)]/30
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
          overflow-hidden"
        aria-label="用户菜单"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initial}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute right-0 top-full mt-2 w-48 rounded-xl
              bg-[var(--color-surface)]/80 backdrop-blur-xl
              border border-white/10
              shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]
              py-1 z-50"
            role="menu"
          >
            {/* 用户信息区域 */}
            <div className="px-3 py-2 border-b border-[var(--color-border-subtle)]">
              <p className="text-sm font-medium text-[var(--color-text)] truncate">
                {user.nickname || '未设置昵称'}
              </p>
            </div>

            {/* 菜单项 */}
            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm
                  text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                  hover:bg-[var(--color-accent-muted)]/50
                  transition-colors active:scale-[0.98]"
                role="menuitem"
              >
                <User size={16} weight="regular" />
                <span>个人信息</span>
              </Link>

              <button
                onClick={() => {
                  setOpen(false)
                  setAboutOpen(true)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm
                  text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                  hover:bg-[var(--color-accent-muted)]/50
                  transition-colors active:scale-[0.98]"
                role="menuitem"
              >
                <Info size={16} weight="regular" />
                <span>关于</span>
              </button>

              {/* 用户管理入口（仅管理员可见） */}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm
                    text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                    hover:bg-[var(--color-accent-muted)]/50
                    transition-colors active:scale-[0.98]"
                  role="menuitem"
                >
                  <UsersThree size={16} weight="regular" />
                  <span>用户管理</span>
                </Link>
              )}
            </div>

            {/* 退出登录 */}
            <div className="border-t border-[var(--color-border-subtle)] py-1">
              <button
                onClick={async () => {
                  setOpen(false)
                  await signOut()
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm
                  text-[var(--color-error)] hover:bg-[var(--color-error-muted)]
                  transition-colors active:scale-[0.98]"
                role="menuitem"
              >
                <SignOut size={16} weight="regular" />
                <span>退出登录</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 关于弹窗 */}
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  )
}
