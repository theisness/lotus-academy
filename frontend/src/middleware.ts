import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase Auth 中间件
 *
 * 在每个请求中刷新用户会话，确保 Server Components
 * 和 Route Handlers 能获取到最新的鉴权状态。
 * 通过 request/response Cookie 操作实现会话令牌的透传与更新。
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 刷新用户会话 — 必须使用 getUser() 而非 getSession()
  // getUser() 会向 Supabase Auth 服务器验证令牌，确保会话有效
  const { data: { user }, error } = await supabase.auth.getUser()

  // 仅当存在无效会话时才清除（如 JWSError JWSInvalidSignature）
  // 对于完全未登录的用户（无 session），不应调用 signOut()，
  // 否则会设置干扰性 Cookie 导致客户端 Supabase 请求丢失 apikey 头
  if (error && !user) {
    // 检查是否真的有残留的 session cookie 需要清理
    const sessionCookie = request.cookies.getAll().find(
      (c) => c.name.includes('auth-token')
    )
    if (sessionCookie) {
      await supabase.auth.signOut()
    }
  }

  return supabaseResponse
}

/**
 * 中间件匹配规则
 * 排除静态文件、图片资源和 favicon
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
