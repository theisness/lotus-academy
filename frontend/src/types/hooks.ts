/**
 * Hook 返回类型接口定义
 */

import type {
  Annotation,
  Book,
  Category,
  UserProfile,
} from './database'
import type {
  AnnotationInput,
  AuthResult,
  BookMetadata,
  MessageWithDetails,
} from './common'

/** useAuth Hook 返回类型 */
export interface UseAuthReturn {
  user: UserProfile | null
  isAdmin: boolean
  loading: boolean
  signUp: (email: string, password: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
}

/** useBooks Hook 返回类型 */
export interface UseBooksReturn {
  books: Book[]
  loading: boolean
  error: Error | null
  searchBooks: (query: string) => void
  uploadBook: (file: File, metadata: BookMetadata) => Promise<Book>
  updateBook: (id: string, data: Partial<BookMetadata>) => Promise<void>
  deleteBook: (id: string) => Promise<void>
}

/** useAnnotations Hook 返回类型 */
export interface UseAnnotationsReturn {
  annotations: Annotation[]
  loading: boolean
  addAnnotation: (data: AnnotationInput) => Promise<Annotation>
  updateAnnotation: (id: string, data: Partial<AnnotationInput>) => Promise<void>
  deleteAnnotation: (id: string) => Promise<void>
}

/** useCategories Hook 返回类型 */
export interface UseCategoriesReturn {
  categories: Category[]
  loading: boolean
  createCategory: (name: string) => Promise<Category>
  updateCategory: (id: string, name: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  addBookToCategory: (categoryId: string, bookId: string) => Promise<void>
  removeBookFromCategory: (categoryId: string, bookId: string) => Promise<void>
}

/** useMessages Hook 返回类型 */
export interface UseMessagesReturn {
  messages: MessageWithDetails[]
  unreadCount: number
  loading: boolean
  markAsRead: (messageId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

/** useUserManagement Hook 返回类型 */
export interface UseUserManagementReturn {
  users: UserProfile[]
  loading: boolean
  searchUsers: (query: string) => void
  updateRole: (userId: string, role: 'admin' | 'user') => Promise<void>
  updateGroupTags: (userId: string, tags: string[]) => Promise<void>
}
