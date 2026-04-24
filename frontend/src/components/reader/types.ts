import type { AnnotationPosition } from '@/types/database'

export interface ReaderHighlight {
  id: string
  position: AnnotationPosition
  color: string
  comment: string
  annotationId: string
  userId?: string
}

export interface PdfReaderProps {
  bookId: string
  fileUrl: string
  canAnnotate: boolean
  canNote?: boolean
  canComment: boolean
  currentUserNickname?: string
  bookTitle: string
  onBack: () => void
}
