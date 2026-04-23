'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Camera,
  FloppyDisk,
  LockKey,
  SpinnerGap,
  Check,
  WarningCircle,
  ArrowLeft,
  Envelope,
} from '@phosphor-icons/react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase'

/** Spring 动效配置 */
const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
}

/** 表单状态 */
interface ProfileForm {
  nickname: string
  bio: string
}

/** 密码表单状态 */
interface PasswordForm {
  newPassword: string
  confirmPassword: string
}

/** 反馈消息 */
interface FeedbackMessage {
  type: 'success' | 'error'
  text: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuthContext()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    nickname: '',
    bio: '',
  })
  const [profileInitialized, setProfileInitialized] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileFeedback, setProfileFeedback] = useState<FeedbackMessage | null>(null)

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Password form state
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordErrors, setPasswordErrors] = useState<{
    newPassword?: string
    confirmPassword?: string
  }>({})
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<FeedbackMessage | null>(null)

  // Email state
  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailFeedback, setEmailFeedback] = useState<FeedbackMessage | null>(null)

  // Initialize form with user data once loaded
  useEffect(() => {
    if (user && !profileInitialized) {
      setProfileForm({
        nickname: user.nickname || '',
        bio: user.bio || '',
      })
      setAvatarPreview(user.avatar_url || null)
      setProfileInitialized(true)

      // Fetch email from auth
      void (async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.email) {
          setCurrentEmail(authUser.email)
          setNewEmail(authUser.email)
        }
      })()
    }
  }, [user, profileInitialized, supabase])

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [authLoading, user, router])

  /** 保存个人资料 */
  const handleSaveProfile = useCallback(async () => {
    if (!user) return

    setSavingProfile(true)
    setProfileFeedback(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: profileForm.nickname.trim() || null,
          bio: profileForm.bio.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        throw new Error(error.message)
      }

      setProfileFeedback({ type: 'success', text: '个人资料保存成功' })

      // Auto-dismiss after 3 seconds
      setTimeout(() => setProfileFeedback(null), 3000)
    } catch (err) {
      setProfileFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : '保存失败，请重试',
      })
    } finally {
      setSavingProfile(false)
    }
  }, [user, supabase, profileForm])

  /** 处理头像文件选择 */
  const handleAvatarChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !user) return

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setProfileFeedback({ type: 'error', text: '请选择图片文件' })
        return
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setProfileFeedback({ type: 'error', text: '图片大小不能超过 2MB' })
        return
      }

      setUploadingAvatar(true)
      setProfileFeedback(null)

      try {
        // Generate unique file path (bucket is already 'avatars', so path is relative within it)
        const ext = file.name.split('.').pop() || 'jpg'
        const filePath = `${user.id}/${Date.now()}.${ext}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: true,
          })

        if (uploadError) {
          throw new Error(`头像上传失败: ${uploadError.message}`)
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(filePath)

        // Update profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            avatar_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)

        if (updateError) {
          throw new Error(`头像更新失败: ${updateError.message}`)
        }

        setAvatarPreview(publicUrl)
        setProfileFeedback({ type: 'success', text: '头像更新成功' })
        setTimeout(() => setProfileFeedback(null), 3000)
      } catch (err) {
        setProfileFeedback({
          type: 'error',
          text: err instanceof Error ? err.message : '头像上传失败，请重试',
        })
      } finally {
        setUploadingAvatar(false)
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [user, supabase]
  )

  /** 密码校验 */
  const validatePassword = useCallback((): boolean => {
    const errors: { newPassword?: string; confirmPassword?: string } = {}

    if (!passwordForm.newPassword) {
      errors.newPassword = '请输入新密码'
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = '密码长度不能少于 8 个字符'
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = '请确认新密码'
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致'
    }

    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }, [passwordForm])

  /** 修改密码 */
  const handleChangePassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validatePassword()) return

      setSavingPassword(true)
      setPasswordFeedback(null)

      try {
        const { error } = await supabase.auth.updateUser({
          password: passwordForm.newPassword,
        })

        if (error) {
          throw new Error(error.message)
        }

        setPasswordFeedback({
          type: 'success',
          text: '密码修改成功，请重新登录',
        })

        // Sign out after 2 seconds
        setTimeout(async () => {
          await signOut()
          router.push('/auth')
        }, 2000)
      } catch (err) {
        setPasswordFeedback({
          type: 'error',
          text: err instanceof Error ? err.message : '密码修改失败，请重试',
        })
      } finally {
        setSavingPassword(false)
      }
    },
    [validatePassword, passwordForm, supabase, signOut, router]
  )

  /** 修改邮箱 */
  const handleChangeEmail = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const trimmedEmail = newEmail.trim()
      if (!trimmedEmail) {
        setEmailFeedback({ type: 'error', text: '请输入邮箱地址' })
        return
      }
      if (trimmedEmail === currentEmail) {
        setEmailFeedback({ type: 'error', text: '新邮箱与当前邮箱相同' })
        setTimeout(() => setEmailFeedback(null), 3000)
        return
      }

      setSavingEmail(true)
      setEmailFeedback(null)

      try {
        const result = await Promise.race([
          supabase.auth.updateUser({ email: trimmedEmail }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('请求超时')), 15000)),
        ])

        if (result.error) {
          throw new Error(result.error.message)
        }

        // 邮箱变更需要确认邮件，不立即更新 currentEmail
        if ((result.data.user as Record<string, unknown>)?.new_email) {
          setEmailFeedback({
            type: 'success',
            text: '确认邮件已发送到新邮箱，请查收并点击确认链接',
          })
        } else {
          setCurrentEmail(trimmedEmail)
          setEmailFeedback({ type: 'success', text: '邮箱修改成功' })
        }
      } catch (err) {
        setEmailFeedback({
          type: 'error',
          text: err instanceof Error ? err.message : '邮箱修改失败，请重试',
        })
      } finally {
        setSavingEmail(false)
      }
    },
    [newEmail, currentEmail, supabase]
  )

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="py-16 flex flex-col items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-[var(--color-border-subtle)] animate-pulse" />
        <div className="h-4 w-32 rounded bg-[var(--color-border-subtle)] animate-pulse" />
        <div className="h-3 w-48 rounded bg-[var(--color-border-subtle)] animate-pulse" />
        <div className="mt-8 w-full max-w-md space-y-4">
          <div className="h-10 rounded-lg bg-[var(--color-border-subtle)] animate-pulse" />
          <div className="h-10 rounded-lg bg-[var(--color-border-subtle)] animate-pulse" />
          <div className="h-24 rounded-lg bg-[var(--color-border-subtle)] animate-pulse" />
        </div>
      </div>
    )
  }

  const displayInitial = (user.nickname || user.id || '?').charAt(0).toUpperCase()

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

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-12">
        {/* Left column: Avatar */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springTransition, delay: 0.05 }}
          className="flex flex-col items-center lg:items-start gap-4"
        >
          {/* Avatar */}
          <div className="relative group">
            <div
              className="h-24 w-24 rounded-full overflow-hidden
                bg-[var(--color-accent-muted)] flex items-center justify-center
                ring-2 ring-[var(--color-border-subtle)]"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={user.nickname || '用户头像'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-[var(--color-accent)]">
                  {displayInitial}
                </span>
              )}

              {/* Upload overlay */}
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-zinc-950/40">
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

            {/* Camera button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center
                rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]
                text-[var(--color-text-muted)] hover:text-[var(--color-accent)]
                hover:border-[var(--color-accent)] transition-colors active:scale-[0.98]
                shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="更换头像"
            >
              <Camera size={14} weight="bold" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              aria-label="选择头像图片"
            />
          </div>

          <div className="text-center lg:text-left">
            <p className="text-base font-medium text-[var(--color-text)]">
              {user.nickname || '未设置昵称'}
            </p>
            <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
              {user.role === 'admin' ? '管理员' : '普通用户'}
            </p>
          </div>
        </motion.div>

        {/* Right column: Forms */}
        <div className="flex flex-col gap-8">
          {/* Profile section */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text)] mb-5">
              个人资料
            </h2>

            {/* Profile feedback */}
            <AnimatePresence>
              {profileFeedback && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springTransition}
                  className="mb-4 overflow-hidden"
                >
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${
                      profileFeedback.type === 'success'
                        ? 'border-[var(--color-accent)]/20 bg-[var(--color-accent-muted)]'
                        : 'border-[var(--color-error)]/20 bg-[var(--color-error-muted)]'
                    }`}
                  >
                    {profileFeedback.type === 'success' ? (
                      <Check size={16} weight="bold" className="text-[var(--color-accent)] shrink-0" />
                    ) : (
                      <WarningCircle size={16} weight="bold" className="text-[var(--color-error)] shrink-0" />
                    )}
                    <p
                      className={`text-sm ${
                        profileFeedback.type === 'success'
                          ? 'text-[var(--color-text)]'
                          : 'text-[var(--color-error)]'
                      }`}
                    >
                      {profileFeedback.text}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-5 max-w-lg">
              {/* Nickname */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="nickname"
                  className="text-sm font-medium text-[var(--color-text)]"
                >
                  昵称
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
                  />
                  <input
                    id="nickname"
                    type="text"
                    value={profileForm.nickname}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, nickname: e.target.value }))
                    }
                    placeholder="设置你的昵称"
                    className="w-full rounded-lg border border-[var(--color-border)]
                      bg-[var(--color-surface)] py-2.5 pl-10 pr-4
                      text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)]
                      outline-none transition-colors
                      focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="bio"
                  className="text-sm font-medium text-[var(--color-text)]"
                >
                  个人简介
                </label>
                <textarea
                  id="bio"
                  value={profileForm.bio}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="写一段简短的自我介绍..."
                  rows={3}
                  className="w-full rounded-lg border border-[var(--color-border)]
                    bg-[var(--color-surface)] py-2.5 px-4
                    text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)]
                    outline-none transition-colors resize-none
                    focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30"
                />
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <motion.button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-lg
                    bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white
                    transition-colors hover:bg-[var(--color-accent-hover)]
                    disabled:cursor-not-allowed disabled:opacity-60
                    active:scale-[0.98]"
                >
                  {savingProfile ? (
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
                  <span>保存资料</span>
                </motion.button>
              </div>
            </div>
          </motion.section>

          {/* Divider */}
          <div className="h-px bg-[var(--color-border-subtle)]" />

          {/* Email section */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.12 }}
          >
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text)] mb-5">
              邮箱地址
            </h2>

            {/* Email feedback */}
            <AnimatePresence>
              {emailFeedback && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springTransition}
                  className="mb-4 overflow-hidden"
                >
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${
                      emailFeedback.type === 'success'
                        ? 'border-[var(--color-accent)]/20 bg-[var(--color-accent-muted)]'
                        : 'border-[var(--color-error)]/20 bg-[var(--color-error-muted)]'
                    }`}
                  >
                    {emailFeedback.type === 'success' ? (
                      <Check size={16} weight="bold" className="text-[var(--color-accent)] shrink-0" />
                    ) : (
                      <WarningCircle size={16} weight="bold" className="text-[var(--color-error)] shrink-0" />
                    )}
                    <p
                      className={`text-sm ${
                        emailFeedback.type === 'success'
                          ? 'text-[var(--color-text)]'
                          : 'text-[var(--color-error)]'
                      }`}
                    >
                      {emailFeedback.text}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleChangeEmail} className="flex flex-col gap-5 max-w-lg">
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
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="请输入邮箱"
                    className="w-full rounded-lg border border-[var(--color-border)]
                      bg-[var(--color-surface)] py-2.5 pl-10 pr-4
                      text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)]
                      outline-none transition-colors
                      focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <motion.button
                  type="submit"
                  disabled={savingEmail || newEmail.trim() === currentEmail}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-lg
                    border border-[var(--color-border)] bg-[var(--color-surface)]
                    px-4 py-2.5 text-sm font-medium text-[var(--color-text)]
                    transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]
                    disabled:cursor-not-allowed disabled:opacity-60
                    active:scale-[0.98]"
                >
                  {savingEmail ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="inline-flex"
                    >
                      <SpinnerGap size={16} />
                    </motion.span>
                  ) : (
                    <Envelope size={16} weight="bold" />
                  )}
                  <span>修改邮箱</span>
                </motion.button>
              </div>
            </form>
          </motion.section>

          {/* Divider */}
          <div className="h-px bg-[var(--color-border-subtle)]" />

          {/* Password section */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.15 }}
          >
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text)] mb-5">
              修改密码
            </h2>

            {/* Password feedback */}
            <AnimatePresence>
              {passwordFeedback && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springTransition}
                  className="mb-4 overflow-hidden"
                >
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${
                      passwordFeedback.type === 'success'
                        ? 'border-[var(--color-accent)]/20 bg-[var(--color-accent-muted)]'
                        : 'border-[var(--color-error)]/20 bg-[var(--color-error-muted)]'
                    }`}
                  >
                    {passwordFeedback.type === 'success' ? (
                      <Check size={16} weight="bold" className="text-[var(--color-accent)] shrink-0" />
                    ) : (
                      <WarningCircle size={16} weight="bold" className="text-[var(--color-error)] shrink-0" />
                    )}
                    <p
                      className={`text-sm ${
                        passwordFeedback.type === 'success'
                          ? 'text-[var(--color-text)]'
                          : 'text-[var(--color-error)]'
                      }`}
                    >
                      {passwordFeedback.text}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-5 max-w-lg">
              {/* New password */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="new-password"
                  className="text-sm font-medium text-[var(--color-text)]"
                >
                  新密码
                </label>
                <div className="relative">
                  <LockKey
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
                  />
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    onBlur={() => {
                      if (passwordForm.newPassword && passwordForm.newPassword.length < 8) {
                        setPasswordErrors((prev) => ({
                          ...prev,
                          newPassword: '密码长度不能少于 8 个字符',
                        }))
                      } else {
                        setPasswordErrors((prev) => {
                          const { newPassword: _, ...rest } = prev
                          void _
                          return rest
                        })
                      }
                    }}
                    placeholder="至少 8 个字符"
                    className={`w-full rounded-lg border bg-[var(--color-surface)]
                      py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)]
                      placeholder:text-[var(--color-text-subtle)]
                      outline-none transition-colors
                      focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30
                      ${passwordErrors.newPassword
                        ? 'border-[var(--color-error)]'
                        : 'border-[var(--color-border)]'
                      }`}
                  />
                </div>
                <AnimatePresence>
                  {passwordErrors.newPassword && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={springTransition}
                      className="text-xs text-[var(--color-error)]"
                    >
                      {passwordErrors.newPassword}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Confirm password */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="confirm-password"
                  className="text-sm font-medium text-[var(--color-text)]"
                >
                  确认新密码
                </label>
                <div className="relative">
                  <LockKey
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
                  />
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    onBlur={() => {
                      if (
                        passwordForm.confirmPassword &&
                        passwordForm.newPassword !== passwordForm.confirmPassword
                      ) {
                        setPasswordErrors((prev) => ({
                          ...prev,
                          confirmPassword: '两次输入的密码不一致',
                        }))
                      } else {
                        setPasswordErrors((prev) => {
                          const { confirmPassword: _, ...rest } = prev
                          void _
                          return rest
                        })
                      }
                    }}
                    placeholder="再次输入新密码"
                    className={`w-full rounded-lg border bg-[var(--color-surface)]
                      py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)]
                      placeholder:text-[var(--color-text-subtle)]
                      outline-none transition-colors
                      focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30
                      ${passwordErrors.confirmPassword
                        ? 'border-[var(--color-error)]'
                        : 'border-[var(--color-border)]'
                      }`}
                  />
                </div>
                <AnimatePresence>
                  {passwordErrors.confirmPassword && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={springTransition}
                      className="text-xs text-[var(--color-error)]"
                    >
                      {passwordErrors.confirmPassword}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit button */}
              <div className="flex justify-end">
                <motion.button
                  type="submit"
                  disabled={savingPassword}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 rounded-lg
                    border border-[var(--color-border)] bg-[var(--color-surface)]
                    px-4 py-2.5 text-sm font-medium text-[var(--color-text)]
                    transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]
                    disabled:cursor-not-allowed disabled:opacity-60
                    active:scale-[0.98]"
                >
                  {savingPassword ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="inline-flex"
                    >
                      <SpinnerGap size={16} />
                    </motion.span>
                  ) : (
                    <LockKey size={16} weight="bold" />
                  )}
                  <span>修改密码</span>
                </motion.button>
              </div>
            </form>
          </motion.section>
        </div>
      </div>
    </motion.div>
  )
}

