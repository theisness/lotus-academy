import { PrivateBookshelfClientWrapper } from '@/components/bookshelf/PrivateBookshelfClientWrapper'

/**
 * 个人书架页面
 *
 * Server Component 入口，渲染 PrivateBookshelfClientWrapper 客户端组件。
 * 登录校验和所有交互逻辑在 PrivateBookshelfClient 中处理。
 */
export default function PrivateBookshelfPage() {
  return <PrivateBookshelfClientWrapper />
}
