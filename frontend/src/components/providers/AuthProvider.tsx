'use client'

import { createContext, useContext } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { UseAuthReturn } from '@/types/hooks'

const AuthContext = createContext<UseAuthReturn | null>(null)

/**
 * AuthProvider — 全局鉴权状态提供者
 *
 * 内部使用 useAuth Hook 管理鉴权状态，
 * 通过 React Context 向子组件树提供用户信息和鉴权操作。
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

/**
 * useAuthContext — 便捷 Hook，从 Context 获取鉴权状态
 *
 * 必须在 AuthProvider 内部使用，否则抛出错误。
 */
export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext 必须在 AuthProvider 内部使用')
  }

  return context
}
