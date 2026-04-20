import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 创建服务端 Supabase 客户端
 *
 * 使用 `@supabase/ssr` 的 `createServerClient`，
 * 通过 Next.js 的 `cookies()` API 管理会话。
 * 适用于 Server Components、Route Handlers 和 Server Actions。
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll 在 Server Component 中被调用时会抛出异常，
            // 如果已配置中间件刷新用户会话，可安全忽略此错误。
          }
        },
      },
    }
  )
}
