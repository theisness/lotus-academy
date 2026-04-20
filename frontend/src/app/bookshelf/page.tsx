import { BookshelfClient } from '@/components/bookshelf/BookshelfClient'

/**
 * 公共书架页面
 *
 * Server Component 入口，渲染 BookshelfClient 客户端组件。
 * 所有交互逻辑在 BookshelfClient 中处理。
 */
export default function BookshelfPage() {
  return <BookshelfClient />
}
