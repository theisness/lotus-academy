'use client'

import { useRef } from 'react'
import { UploadSimple } from '@phosphor-icons/react'
import type { BookUploadButtonProps } from '@/types/components'

/**
 * BookUploadButton — PDF 书籍上传按钮
 *
 * 仅接受 .pdf 文件。选择文件后通过 onUpload 回调
 * 将 File 对象传递给父组件处理上传逻辑。
 */
export function BookUploadButton({ onUpload }: BookUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleClick() {
    inputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    onUpload(file)

    // Reset input so the same file can be re-selected
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-lg
          bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white
          transition-colors hover:bg-[var(--color-accent-hover)]
          active:scale-[0.98]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        aria-label="上传 PDF 书籍"
      >
        <UploadSimple size={18} weight="bold" />
        <span>上传书籍</span>
      </button>
    </>
  )
}
