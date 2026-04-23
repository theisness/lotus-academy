'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const tokenHash = searchParams.get('token')
    const type = searchParams.get('type') as 'email_change' | 'signup' | 'recovery' | 'email'
    const redirectTo = searchParams.get('redirect_to') || '/profile'

    if (!tokenHash || !type) {
      setError('无效的验证链接')
      return
    }

    const supabase = createClient()

    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error: err }: { error: Error | null }) => {
      if (err) {
        setError(err.message)
      } else {
        router.replace(redirectTo)
      }
    })
  }, [searchParams, router])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/profile" className="text-[var(--color-accent)] hover:underline">返回个人中心</a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-zinc-400">正在验证...</p>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-zinc-400">加载中...</p></div>}>
      <VerifyContent />
    </Suspense>
  )
}
