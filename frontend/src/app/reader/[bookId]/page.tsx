import { ReaderClient } from '@/components/reader/ReaderClient'

/**
 * PDF 阅读器页面
 *
 * Server Component 入口，接收 bookId 路由参数，
 * 渲染 ReaderClient 客户端组件处理所有交互逻辑。
 */
export default async function ReaderPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params

  return <ReaderClient bookId={bookId} />
}
