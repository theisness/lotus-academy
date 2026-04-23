'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { AuthChangeEvent, Session, UserResponse } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/database'
import type { AuthResult } from '@/types/common'
import type { UseAuthReturn } from '@/types/hooks'

// 在模块级别获取单例客户端，避免每次渲染创建新实例
const supabase = createClient()

/**
 * useAuth Hook — 鉴权状态管理
 *
 * 提供用户注册、登录、退出、修改密码等功能，
 * 通过 onAuthStateChange 监听鉴权状态变化，
 * 从 profiles 表读取用户角色和资料信息。
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  /**
   * 根据用户 ID 从 profiles 表获取用户资料
   */
  const fetchProfile = useCallback(
    async (userId: string): Promise<UserProfile | null> => {
      console.log('[useAuth] fetchProfile called for:', userId)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        console.log('[useAuth] fetchProfile result:', { data, error: error?.message })
        
        if (error || !data) {
          return null
        }

        return data as UserProfile
      } catch (err) {
        console.error('[useAuth] fetchProfile error:', err)
        return null
      }
    },
    []
  )

  /**
   * 监听鉴权状态变化，维护 user 和 isAdmin 状态
   */
  useEffect(() => {
    let mounted = true
    let initializing = true

    // 初始化时验证当前会话 - 必须调用 getUser()
    // 这是触发 /auth/v1/user 接口的关键
    const initAuth = async () => {
      console.log('[useAuth] initAuth started')
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser()
        console.log('[useAuth] getUser result:', { userId: authUser?.id, error: error?.message })
        
        if (!mounted) return
        
        if (error || !authUser) {
          console.log('[useAuth] No valid user, clearing state')
          // 仅当确实存在无效 session 时才清除
          if (error?.message?.includes('JWS') || error?.message?.includes('JWT')) {
            try {
              const { data: { session } } = await supabase.auth.getSession()
              if (session) {
                await supabase.auth.signOut()
              }
            } catch {
              // 忽略 signOut 错误
            }
          }
          if (mounted) {
            setUser(null)
            setIsAdmin(false)
            setLoading(false)
            initializing = false
          }
          return
        }
        
        console.log('[useAuth] Fetching profile for user:', authUser.id)
        const profile = await fetchProfile(authUser.id)
        console.log('[useAuth] Profile result:', { profileId: profile?.id, role: profile?.role })
        if (mounted) {
          setUser(profile)
          setIsAdmin(profile?.role === 'admin')
          setLoading(false)
          initializing = false
        }
      } catch (error) {
        console.error('[useAuth] Auth initialization error:', error)
        if (mounted) {
          setUser(null)
          setIsAdmin(false)
          setLoading(false)
          initializing = false
        }
      }
    }

    // 立即调用初始化
    initAuth()

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log('[useAuth] Auth state changed:', event, 'initializing:', initializing)
      
      // 初始化期间忽略所有事件（initAuth 会处理），避免竞态
      // 仅处理 SIGNED_OUT 事件（用户主动退出）
      if (initializing && event !== 'SIGNED_OUT') {
        console.log('[useAuth] Ignoring', event, 'during initialization')
        return
      }
      
      if (!mounted) return

      // JWT 失效或退出登录 → 跳转到登录页
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        setUser(null)
        setIsAdmin(false)
        setLoading(false)
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth'
        }
        return
      }
      
      try {
        if (session?.user) {
          console.log('[useAuth] Fetching profile for session user:', session.user.id)
          const profile = await fetchProfile(session.user.id)
          if (mounted) {
            setUser(profile)
            setIsAdmin(profile?.role === 'admin')
          }
        } else {
          if (mounted) {
            setUser(null)
            setIsAdmin(false)
          }
        }
      } catch (error) {
        console.error('[useAuth] Auth state change error:', error)
        if (mounted) {
          setUser(null)
          setIsAdmin(false)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  /**
   * 邮箱 + 密码注册
   */
  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    },
    [supabase]
  )

  /**
   * 邮箱 + 密码登录
   */
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    },
    [supabase]
  )

  /**
   * 退出登录
   */
  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
  }, [supabase])

  /**
   * 修改密码
   */
  const updatePassword = useCallback(
    async (newPassword: string): Promise<void> => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        throw new Error(error.message)
      }
    },
    [supabase]
  )

  return {
    user,
    isAdmin,
    loading,
    signUp,
    signIn,
    signOut,
    updatePassword,
  }
}

