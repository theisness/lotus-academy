'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, ArrowRight, SpinnerGap, BookOpenText } from '@phosphor-icons/react'
import { useAuthContext } from '@/components/providers/AuthProvider'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { updatePassword } = useAuthContext()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('密码长度不能少于 8 个字符'); return }
    if (password !== confirm) { setError('两次输入的密码不一致'); return }
    setSubmitting(true)
    try {
      await updatePassword(password)
      router.replace('/bookshelf')
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }, [password, confirm, updatePassword, router])

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-3 mb-8">
          <BookOpenText size={28} weight="duotone" className="text-[var(--color-accent)]" />
          <span className="text-lg font-medium text-[var(--color-text)]">莲花书院</span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tighter text-[var(--color-text)] mb-2">设置新密码</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">请输入新密码</p>

        {error && (
          <div className="mb-6 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error-muted)] px-4 py-3">
            <p className="text-sm text-[var(--color-error)]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-[var(--color-text)]">新密码</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
              <input id="password" type="password" autoComplete="new-password" placeholder="至少 8 个字符" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none transition-colors focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="confirm" className="text-sm font-medium text-[var(--color-text)]">确认密码</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
              <input id="confirm" type="password" autoComplete="new-password" placeholder="再次输入新密码" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none transition-colors focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30" />
            </div>
          </div>
          <motion.button type="submit" disabled={submitting} whileTap={{ scale: 0.98 }}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? (
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="inline-flex"><SpinnerGap size={18} /></motion.span>
            ) : (<>确认重置<ArrowRight size={16} /></>)}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
