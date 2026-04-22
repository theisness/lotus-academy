'use client'

import { useState, useEffect } from 'react'
import { CaretRight } from '@phosphor-icons/react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface OutlineItem {
  title: string
  dest: string | Array<unknown> | null
  items: OutlineItem[]
}

interface OutlinePanelProps {
  pdfDocument: PDFDocumentProxy
  onPageChange: (page: number) => void
}

function OutlineNode({
  item,
  pdfDocument,
  onPageChange,
  depth,
}: {
  item: OutlineItem
  pdfDocument: PDFDocumentProxy
  onPageChange: (page: number) => void
  depth: number
}) {
  const [expanded, setExpanded] = useState(depth === 0)

  const handleClick = async () => {
    if (!item.dest) return
    try {
      const dest = typeof item.dest === 'string'
        ? await pdfDocument.getDestination(item.dest)
        : item.dest
      if (!dest) return
      const ref = dest[0]
      const pageIndex = await pdfDocument.getPageIndex(ref)
      onPageChange(pageIndex + 1)
    } catch {
      // 静默处理
    }
  }

  return (
    <div>
      <div
        className="flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer
          text-sm text-zinc-300 hover:bg-zinc-700/60 hover:text-white transition-colors"
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        onClick={handleClick}
      >
        {item.items.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
            className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <CaretRight
              size={12}
              weight="bold"
              className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          </button>
        )}
        <span className="line-clamp-2 leading-snug">{item.title}</span>
      </div>
      {expanded && item.items.map((child, i) => (
        <OutlineNode
          key={i}
          item={child}
          pdfDocument={pdfDocument}
          onPageChange={onPageChange}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

export function OutlinePanel({ pdfDocument, onPageChange }: OutlinePanelProps) {
  const [outline, setOutline] = useState<OutlineItem[]>([])

  useEffect(() => {
    pdfDocument.getOutline().then((items) => {
      setOutline((items as OutlineItem[]) ?? [])
    }).catch(() => setOutline([]))
  }, [pdfDocument])

  if (outline.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-500 px-4 text-center">
        此文档没有章节目录
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full py-2 space-y-0.5">
      {outline.map((item, i) => (
        <OutlineNode
          key={i}
          item={item}
          pdfDocument={pdfDocument}
          onPageChange={onPageChange}
          depth={0}
        />
      ))}
    </div>
  )
}
