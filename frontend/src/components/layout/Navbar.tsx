'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpenText, List, X } from '@phosphor-icons/react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase'
import { UserAvatar } from './UserAvatar'
import { MessageBox } from './MessageBox'

/**
 * Navbar — 顶部导航栏
 *
 * 包含：Logo/品牌名、公共/个人书架切换、消息通知按钮、用户头像。
 * 未登录状态显示登录/注册按钮。
 * 移动端使用汉堡菜单展开导航。
 * 使用 sticky 定位 + glassmorphism 效果。
 */

const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

export function Navbar() {
  const { user, loading } = useAuthContext()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isPublicActive = pathname === '/bookshelf' || pathname === '/'
  const isPrivateActive = pathname === '/bookshelf/private'

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu on click outside
  useEffect(() => {
    if (!mobileMenuOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileMenuOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  /**
   * 保存页面偏好到 profiles 表
   * 在用户切换书架时调用
   */
  const savePagePreference = (preference: 'public' | 'private') => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('profiles')
      .update({ page_preference: preference })
      .eq('id', user.id)
      .then(() => {
        // 静默更新，无需处理结果
      })
  }

  return (
    <nav
      className="sticky top-0 z-40 w-full
        bg-[var(--color-surface)]/80 backdrop-blur-xl
        border-b border-[var(--color-border-subtle)]
        shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]"
    >
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 md:px-6">
        {/* 左侧：Logo + 品牌名 */}
        <Link
          href="/bookshelf"
          className="flex items-center gap-2 transition-opacity hover:opacity-80 active:scale-[0.98]"
        >
          <BookOpenText
            size={24}
            weight="duotone"
            className="text-[var(--color-accent)]"
          />
          <span className="text-base font-semibold tracking-tight text-[var(--color-text)]">
            莲花书院
          </span>
        </Link>

        {/* 中间：书架切换（仅登录用户可见，桌面端） */}
        {!loading && user && (
          <div className="hidden items-center gap-1 rounded-lg bg-[var(--color-bg)] p-1 md:flex">
            <Link
              href="/bookshelf"
              onClick={() => savePagePreference('public')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all active:scale-[0.98]
                ${
                  isPublicActive
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
            >
              公共书架
            </Link>
            <Link
              href="/bookshelf/private"
              onClick={() => savePagePreference('private')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all active:scale-[0.98]
                ${
                  isPrivateActive
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
            >
              个人书架
            </Link>
          </div>
        )}

        {/* 右侧：通知 + 头像 / 登录按钮 */}
        <div className="flex items-center gap-3">
          {loading ? (
            /* 加载中占位 */
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-border-subtle)]" />
          ) : user ? (
            <>
              {/* 消息通知 */}
              <MessageBox />

              {/* 用户头像（桌面端） */}
              <div className="hidden md:block">
                <UserAvatar />
              </div>

              {/* 汉堡菜单按钮（移动端） */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-lg
                  text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                  hover:bg-[var(--color-border-subtle)]
                  transition-colors active:scale-[0.98] md:hidden"
                aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X size={20} weight="bold" />
                ) : (
                  <List size={20} weight="bold" />
                )}
              </button>
            </>
          ) : (
            /* 未登录：登录/注册按钮 */
            <Link
              href="/auth"
              className="rounded-lg bg-[var(--color-accent)] px-4 py-1.5
                text-sm font-medium text-white
                hover:bg-[var(--color-accent-hover)]
                transition-colors active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              登录 / 注册
            </Link>
          )}
        </div>
      </div>

      {/* 移动端抽屉菜单 */}
      <AnimatePresence>
        {mobileMenuOpen && user && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 top-14 z-40 bg-zinc-950/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* 菜单面板 */}
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={springTransition}
              className="absolute left-0 right-0 top-14 z-50
                border-b border-[var(--color-border-subtle)]
                bg-[var(--color-surface)]/95 backdrop-blur-xl
                shadow-lg md:hidden"
            >
              <div className="mx-auto max-w-[1400px] px-4 py-4">
                {/* 书架切换 */}
                <div className="mb-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                    书架
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/bookshelf"
                      onClick={() => {
                        savePagePreference('public')
                        setMobileMenuOpen(false)
                      }}
                      className={`flex items-center justify-center rounded-lg px-4 py-2.5
                        text-sm font-medium transition-all active:scale-[0.98]
                        ${
                          isPublicActive
                            ? 'bg-[var(--color-accent)] text-white shadow-sm'
                            : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                    >
                      公共书架
                    </Link>
                    <Link
                      href="/bookshelf/private"
                      onClick={() => {
                        savePagePreference('private')
                        setMobileMenuOpen(false)
                      }}
                      className={`flex items-center justify-center rounded-lg px-4 py-2.5
                        text-sm font-medium transition-all active:scale-[0.98]
                        ${
                          isPrivateActive
                            ? 'bg-[var(--color-accent)] text-white shadow-sm'
                            : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                    >
                      个人书架
                    </Link>
                  </div>
                </div>

                {/* 分隔线 */}
                <div className="my-3 h-px bg-[var(--color-border-subtle)]" />

                {/* 用户信息 + 操作 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full
                        bg-[var(--color-accent-muted)] text-[var(--color-accent)]
                        text-sm font-medium overflow-hidden"
                    >
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.nickname || '用户头像'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>
                          {(user.nickname || user.id || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {user.nickname || '未设置昵称'}
                      </p>
                      <p className="text-xs text-[var(--color-text-subtle)]">
                        {user.role === 'admin' ? '管理员' : '普通用户'}
                      </p>
                    </div>
                  </div>
                  <UserAvatar />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  )
}
