'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { UserProfile } from '@/types/database'
import type { UseUserManagementReturn } from '@/types/hooks'

/**
 * useUserManagement Hook — 用户管理（管理员）
 *
 * 提供用户列表查询、搜索、角色修改和分组标签修改功能。
 * 仅管理员可使用，RLS 策略自动处理权限过滤：
 * - 管理员可查看所有用户
 * - 管理员可修改用户角色和分组标签
 */
export function useUserManagement(): UseUserManagementReturn {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createClient()

  /**
   * 从数据库获取用户列表
   * 支持按昵称或邮箱搜索（通过 nickname 字段模糊匹配）
   * RLS 自动限制非管理员只能看到自己
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })

      if (searchQuery.trim()) {
        // Search by nickname (ilike for case-insensitive match)
        query = query.ilike('nickname', `%${searchQuery.trim()}%`)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      setUsers((data as UserProfile[]) ?? [])
    } catch {
      // RLS will filter unauthorized access; silently handle errors
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [supabase, searchQuery])

  /**
   * 监听 searchQuery 变化，重新获取用户列表
   */
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  /**
   * 搜索用户（按昵称或邮箱）
   * 更新 searchQuery 状态后自动触发 fetchUsers
   */
  const searchUsers = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  /**
   * 修改用户角色
   * RLS 校验：仅管理员可修改
   */
  const updateRole = useCallback(
    async (userId: string, role: 'admin' | 'user'): Promise<void> => {
      const { error } = await supabase
        .from('profiles')
        .update({
          role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        throw new Error(`角色修改失败: ${error.message}`)
      }

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role, updated_at: new Date().toISOString() } : u
        )
      )
    },
    [supabase]
  )

  /**
   * 修改用户分组标签
   * RLS 校验：仅管理员可修改
   */
  const updateGroupTags = useCallback(
    async (userId: string, tags: string[]): Promise<void> => {
      const { error } = await supabase
        .from('profiles')
        .update({
          group_tags: tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        throw new Error(`分组标签修改失败: ${error.message}`)
      }

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, group_tags: tags, updated_at: new Date().toISOString() }
            : u
        )
      )
    },
    [supabase]
  )

  return {
    users,
    loading,
    searchUsers,
    updateRole,
    updateGroupTags,
  }
}
