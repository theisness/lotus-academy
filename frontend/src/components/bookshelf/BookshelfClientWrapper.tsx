'use client'

import dynamic from 'next/dynamic'
import { SpinnerGap } from '@phosphor-icons/react'

/**
 * BookshelfClientWrapper — 客户端包装组件
 *
 * 使用 dynamic import 禁用 SSR，避免 framer-motion 等库在服务端渲染时出错。
 */

const BookshelfClient = dynamic(
  () => import('./BookshelfClient').then((mod) => mod.BookshelfClient),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-4">
          <SpinnerGap
            size={32}
            className="animate-spin text-[var(--color-accent)]"
          />
          <p className="text-sm text-[var(--color-text-muted)]">
            正在加载书架...
          </p>
        </div>
      </div>
    ),
  }
)

export function BookshelfClientWrapper() {
  return <BookshelfClient />
}
