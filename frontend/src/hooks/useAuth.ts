'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/database'
import type { AuthResult } from '@/types/common'
import type { UseAuthReturn } from '@/types/hooks'

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

  const supabase = createClient()

  /**
   * 根据用户 ID 从 profiles 表获取用户资料
   */
  const fetchProfile = useCallback(
    async (userId: string): Promise<UserProfile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        return null
      }

      return data as UserProfile
    },
    [supabase]
  )

  /**
   * 监听鉴权状态变化，维护 user 和 isAdmin 状态
   */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setUser(profile)
        setIsAdmin(profile?.role === 'admin')
      } else {
        setUser(null)
        setIsAdmin(false)
      }
      setLoading(false)
    })

    // 初始化时获取当前会话
    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setUser(profile)
        setIsAdmin(profile?.role === 'admin')
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

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
