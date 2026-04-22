import { useEffect, useRef } from 'react'
import React from 'react'
import { PdfHighlighter } from 'react-pdf-highlighter-extended'

/**
 * PdfHighlighterWithPages — 包装 PdfHighlighter，在加载时报告总页数并触发回调
 */
export function PdfHighlighterWithPages({
  pdfDocument,
  onTotalPages,
  onLoadComplete,
  children,
  ...props
}: Omit<React.ComponentProps<typeof PdfHighlighter>, 'style'> & {
  onTotalPages: (n: number) => void
  onLoadComplete?: () => void
}) {
  const onLoadCompleteRef = useRef(onLoadComplete)
  onLoadCompleteRef.current = onLoadComplete

  useEffect(() => {
    onTotalPages(pdfDocument.numPages)
    if (onLoadCompleteRef.current) {
      onLoadCompleteRef.current()
    }
  }, [pdfDocument, onTotalPages])

  return (
    <PdfHighlighter
      pdfDocument={pdfDocument}
      style={{ height: '100%', width: '100%' }}
      {...props}
    >
      {children}
    </PdfHighlighter>
  )
}
