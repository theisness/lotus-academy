import { createBrowserClient } from '@supabase/ssr'

/**
 * 创建浏览器端 Supabase 客户端
 *
 * 使用 `@supabase/ssr` 的 `createBrowserClient`，
 * 自动处理浏览器环境下的 Cookie 管理和会话刷新。
 * 适用于客户端组件（'use client'）中的数据请求。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
