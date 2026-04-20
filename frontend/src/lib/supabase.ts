import { createBrowserClient } from '@supabase/ssr'

/**
 * 浏览器端 Supabase 单例客户端
 *
 * `createBrowserClient` 内部已做了单例处理（相同参数返回同一实例），
 * 但为了明确语义、避免每次组件渲染都调用工厂函数，
 * 这里在模块级别缓存实例。
 *
 * 适用于客户端组件（'use client'）中的数据请求。
 */
let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
