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

  // 重要：必须调用 getUser() 来刷新会话
  // 添加超时保护，避免后端不可达时阻塞页面加载
  try {
    const getUserPromise = supabase.auth.getUser()
    
    // 3秒超时保护
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('getUser timeout')), 3000)
    })
    
    await Promise.race([getUserPromise, timeoutPromise])
  } catch (error) {
    // 记录错误但不阻止请求
    console.error('Middleware getUser error:', error)
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
