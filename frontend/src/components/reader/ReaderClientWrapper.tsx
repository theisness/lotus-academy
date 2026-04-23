'use client'

import dynamic from 'next/dynamic'
import { SpinnerGap } from '@phosphor-icons/react'

/**
 * ReaderClientWrapper — 客户端包装组件
 *
 * 使用 dynamic import 禁用 SSR，因为 pdfjs-dist
 * 在模块加载时访问 window/document 对象，无法在服务端运行。
 */

const ReaderClient = dynamic(
  () => import('./ReaderClient').then((mod) => mod.ReaderClient),
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
            正在加载阅读器...
          </p>
        </div>
      </div>
    ),
  }
)

interface ReaderClientWrapperProps {
  bookId: string
}

export function ReaderClientWrapper({ bookId }: ReaderClientWrapperProps) {
  return <ReaderClient bookId={bookId} />
}
