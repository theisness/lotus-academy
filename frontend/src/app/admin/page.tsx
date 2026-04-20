'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft } from '@phosphor-icons/react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { AdminClient } from '@/components/admin/AdminClient'

/** Spring 动效配置 */
const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

export default function AdminPage() {
  const router = useRouter()
  const { user, isAdmin, loading } = useAuthContext()

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/bookshelf')
    }
  }, [loading, user, isAdmin, router])

  // Loading state
  if (loading) {
    return (
      <div className="py-16 flex flex-col gap-4">
        <div className="h-6 w-40 rounded bg-[var(--color-border-subtle)] animate-pulse" />
        <div className="h-10 w-full max-w-sm rounded-lg bg-[var(--color-border-subtle)] animate-pulse" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-[var(--color-border-subtle)] animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  // Guard: non-admin sees nothing while redirecting
  if (!user || !isAdmin) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springTransition}
      className="py-6 md:py-10"
    >
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1.5 text-sm
          text-[var(--color-text-muted)] hover:text-[var(--color-text)]
          transition-colors active:scale-[0.98]"
      >
        <ArrowLeft size={16} weight="regular" />
        <span>返回</span>
      </button>

      <h1 className="text-2xl md:text-3xl font-semibold tracking-tighter leading-none text-[var(--color-text)] mb-6">
        用户管理
      </h1>

      <AdminClient />
    </motion.div>
  )
}
