import { PrivateBookshelfClient } from '@/components/bookshelf/PrivateBookshelfClient'

/**
 * 个人书架页面
 *
 * Server Component 入口，渲染 PrivateBookshelfClient 客户端组件。
 * 登录校验和所有交互逻辑在 PrivateBookshelfClient 中处理。
 */
export default function PrivateBookshelfPage() {
  return <PrivateBookshelfClient />
}
