'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Envelope, Lock, ArrowRight, SpinnerGap, BookOpenText } from '@phosphor-icons/react'
import { useAuthContext } from '@/components/providers/AuthProvider'

/** 表单模式 */
type AuthMode = 'login' | 'register' | 'forgot'

/** 表单字段错误 */
interface FormErrors {
  email?: string
  password?: string
  general?: string
}

/** 邮箱格式校验 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Spring 动效配置 */
const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

export default function AuthPage() {
  const router = useRouter()
  const { signIn, signUp, resetPassword } = useAuthContext()

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registerSuccess, setRegisterSuccess] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  /** 客户端即时校验 */
  const validate = useCallback((): FormErrors => {
    const newErrors: FormErrors = {}

    if (!email.trim()) {
      newErrors.email = '请输入邮箱地址'
    } else if (!isValidEmail(email)) {
      newErrors.email = '邮箱格式不正确'
    }

    if (mode !== 'forgot') {
      if (!password) {
        newErrors.password = '请输入密码'
      } else if (password.length < 8) {
        newErrors.password = '密码长度不能少于 8 个字符'
      }
    }

    return newErrors
  }, [email, password, mode])

  /** 提交表单 */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const validationErrors = validate()
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors)
        return
      }

      setErrors({})
      setIsSubmitting(true)

      try {
        if (mode === 'forgot') {
          const result = await resetPassword(email)
          if (!result.success) {
            setErrors({ general: result.error || '发送失败，请重试' })
          } else {
            setResetSuccess(true)
          }
        } else if (mode === 'login') {
          const result = await signIn(email, password)
          if (!result.success) {
            setErrors({ general: result.error || '登录失败，请重试' })
          } else {
            router.push('/bookshelf')
          }
        } else {
          const result = await signUp(email, password)
          if (!result.success) {
            // 处理邮箱已存在等错误
            const errorMsg = result.error || '注册失败，请重试'
            if (
              errorMsg.toLowerCase().includes('already registered') ||
              errorMsg.toLowerCase().includes('already exists') ||
              errorMsg.includes('已注册') ||
              errorMsg.includes('已存在')
            ) {
              setErrors({ email: '该邮箱已被注册' })
            } else {
              setErrors({ general: errorMsg })
            }
          } else {
            router.push('/bookshelf')
          }
        }
      } catch {
        setErrors({ general: '网络错误，请稍后重试' })
      } finally {
        setIsSubmitting(false)
      }
    },
    [mode, email, password, validate, signIn, signUp, router]
  )

  /** 切换模式时清空状态 */
  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'))
    setErrors({})
    setRegisterSuccess(false)
    setResetSuccess(false)
  }, [])

  /** 邮箱输入失焦时校验 */
  const handleEmailBlur = useCallback(() => {
    if (email && !isValidEmail(email)) {
      setErrors((prev) => ({ ...prev, email: '邮箱格式不正确' }))
    } else {
      setErrors((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { email: _email, ...rest } = prev
        return rest
      })
    }
  }, [email])

  /** 密码输入失焦时校验 */
  const handlePasswordBlur = useCallback(() => {
    if (password && password.length < 8) {
      setErrors((prev) => ({ ...prev, password: '密码长度不能少于 8 个字符' }))
    } else {
      setErrors((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _password, ...rest } = prev
        return rest
      })
    }
  }, [password])

  return (
    <div className="min-h-[100dvh] grid grid-cols-1 md:grid-cols-[1fr_1.2fr]">
      {/* 左侧 — 表单区域 */}
      <div className="flex flex-col justify-center w-full px-4 py-8 sm:px-6 sm:py-12 md:px-16 lg:px-24">
        {/* 品牌标识 */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-2">
            <BookOpenText size={28} weight="duotone" className="text-[var(--color-accent)]" />
            <span className="text-lg font-medium tracking-tight text-[var(--color-text)]">
              莲花书院
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            全中文书城社区
          </p>
        </motion.div>

        {/* 标题 */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={mode}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={springTransition}
            className="text-3xl md:text-4xl font-semibold tracking-tighter leading-none text-[var(--color-text)] mb-2"
          >
            {mode === 'login' ? '欢迎回来' : mode === 'register' ? '创建账户' : '重置密码'}
          </motion.h1>
        </AnimatePresence>

        <p className="text-sm text-[var(--color-text-muted)] mb-8">
          {mode === 'login'
            ? '登录以继续使用莲花书院'
            : mode === 'register'
              ? '注册以开始使用莲花书院'
              : '输入邮箱，我们将发送重置链接'}
        </p>

        {/* 注册成功提示 */}
        <AnimatePresence>
          {registerSuccess && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={springTransition}
              className="mb-6 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-accent-muted)] px-4 py-3"
            >
              <p className="text-sm text-[var(--color-text)]">
                注册成功。请查收确认邮件后登录。
              </p>
            </motion.div>
          )}
          {resetSuccess && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={springTransition}
              className="mb-6 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-accent-muted)] px-4 py-3"
            >
              <p className="text-sm text-[var(--color-text)]">
                重置链接已发送到 {email}，请查收邮件。
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 通用错误提示 */}
        <AnimatePresence>
          {errors.general && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={springTransition}
              className="mb-6 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error-muted)] px-4 py-3"
            >
              <p className="text-sm text-[var(--color-error)]">{errors.general}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 表单 */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className="flex flex-col gap-5"
        >
          {/* 邮箱字段 */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-[var(--color-text)]"
            >
              邮箱
            </label>
            <div className="relative">
              <Envelope
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
              />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="请输入邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                className={`
                  w-full rounded-lg border bg-[var(--color-surface)] py-2.5 pl-10 pr-4
                  text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)]
                  outline-none transition-colors
                  focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30
                  ${errors.email
                    ? 'border-[var(--color-error)]'
                    : 'border-[var(--color-border)]'
                  }
                `}
              />
            </div>
            <AnimatePresence>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springTransition}
                  className="text-xs text-[var(--color-error)]"
                >
                  {errors.email}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* 密码字段（忘记密码模式下隐藏） */}
          {mode !== 'forgot' && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-[var(--color-text)]"
            >
              密码
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
              />
              <input
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'register' ? '至少 8 个字符' : '输入密码'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={handlePasswordBlur}
                className={`
                  w-full rounded-lg border bg-[var(--color-surface)] py-2.5 pl-10 pr-4
                  text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)]
                  outline-none transition-colors
                  focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30
                  ${errors.password
                    ? 'border-[var(--color-error)]'
                    : 'border-[var(--color-border)]'
                  }
                `}
              />
            </div>
            <AnimatePresence>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springTransition}
                  className="text-xs text-[var(--color-error)]"
                >
                  {errors.password}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          )}

          {/* 忘记密码链接（仅登录模式） */}
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => { setMode('forgot'); setErrors({}); setResetSuccess(false) }}
              className="self-end -mt-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
            >
              忘记密码？
            </button>
          )}

          {/* 提交按钮 */}
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileTap={{ scale: 0.98 }}
            className={`
              mt-2 flex items-center justify-center gap-2 rounded-lg
              bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white
              transition-colors hover:bg-[var(--color-accent-hover)]
              disabled:cursor-not-allowed disabled:opacity-60
              active:scale-[0.98]
            `}
          >
            {isSubmitting ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="inline-flex"
              >
                <SpinnerGap size={18} />
              </motion.span>
            ) : (
              <>
                {mode === 'login' ? '登录' : mode === 'register' ? '注册' : '发送重置链接'}
                <ArrowRight size={16} />
              </>
            )}
          </motion.button>
        </motion.form>

        {/* 模式切换 */}
        <div className="mt-8 flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
          <span>{mode === 'login' ? '还没有账户？' : mode === 'register' ? '已有账户？' : '想起密码了？'}</span>
          <button
            type="button"
            onClick={mode === 'forgot' ? () => { setMode('login'); setErrors({}); setResetSuccess(false) } : toggleMode}
            className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
          >
            {mode === 'login' ? '注册' : '登录'}
          </button>
        </div>
      </div>

      {/* 右侧 — 装饰区域（桌面端可见） */}
      <div className="hidden md:flex items-center justify-center relative overflow-hidden bg-[var(--color-surface)]">
        {/* 装饰性背景图案 */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, var(--color-text) 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        {/* 装饰性浮动元素 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springTransition, delay: 0.3 }}
          className="relative z-10 flex flex-col items-center gap-6 px-12"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <BookOpenText
              size={80}
              weight="duotone"
              className="text-[var(--color-accent)]"
            />
          </motion.div>

          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)] mb-2">
              莲花书院
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] max-w-[280px] leading-relaxed">
              在这里，阅读与思考交汇。管理你的书籍，记录你的灵感。
            </p>
          </div>

          {/* 装饰性分隔线 */}
          <div className="w-12 h-px bg-[var(--color-border)]" />

          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-lg font-semibold text-[var(--color-text)]">PDF 阅读器</p>
              <p className="text-xs text-[var(--color-text-muted)]">在线阅读</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--color-text)]">批注</p>
              <p className="text-xs text-[var(--color-text-muted)]">高亮备注</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--color-text)]">书架</p>
              <p className="text-xs text-[var(--color-text-muted)]">分类管理</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}


