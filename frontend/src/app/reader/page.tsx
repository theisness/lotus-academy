'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ReaderClientWrapper } from '@/components/reader/ReaderClientWrapper'

function ReaderContent() {
  const searchParams = useSearchParams()
  const bookId = searchParams.get('bookId')

  if (!bookId) return <div>缺少书籍 ID</div>

  return <ReaderClientWrapper bookId={bookId} />
}

/**
 * PDF 阅读器页面
 *
 * 通过 ?bookId=xxx 查询参数获取书籍 ID，
 * 渲染 ReaderClientWrapper 客户端组件处理所有交互逻辑。
 */
export default function ReaderPage() {
  return (
    <Suspense>
      <ReaderContent />
    </Suspense>
  )
}
