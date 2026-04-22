import type { Highlight } from 'react-pdf-highlighter-extended'

/** 将数据库批注转换为 react-pdf-highlighter-extended 的 Highlight 格式 */
export interface ReaderHighlight extends Highlight {
  color: string
  comment: string
  annotationId: string
}

export interface PdfReaderProps {
  bookId: string
  fileUrl: string
  canAnnotate: boolean
  bookTitle: string
  onBack: () => void
}
