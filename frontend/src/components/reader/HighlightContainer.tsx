import React from 'react'
import {
  TextHighlight,
  useHighlightContainerContext,
  MonitoredHighlightContainer,
} from 'react-pdf-highlighter-extended'
import { HighlightPopup } from './HighlightPopup'
import { DEFAULT_COLOR } from './constants'
import type { ReaderHighlight } from './types'

/**
 * HighlightContainer — 单个高亮的渲染容器
 *
 * 使用 react-pdf-highlighter-extended 的 Context 获取高亮数据，
 * 渲染 TextHighlight 组件并支持悬停弹出备注。
 */
export function HighlightContainer({
  canAnnotate,
  onDelete,
  onUpdateComment,
  scrolledToHighlightId,
}: {
  canAnnotate: boolean
  onDelete: (id: string) => void
  onUpdateComment: (id: string, comment: string) => void
  scrolledToHighlightId: string | null
}) {
  const { highlight, isScrolledTo } =
    useHighlightContainerContext<ReaderHighlight>()

  const highlightTip = canAnnotate
    ? {
        position: highlight.position,
        content: (
          <HighlightPopup
            highlight={highlight}
            onDelete={() => onDelete(highlight.id)}
            onUpdateComment={(comment) =>
              onUpdateComment(highlight.id, comment)
            }
          />
        ),
      }
    : highlight.comment
      ? {
          position: highlight.position,
          content: (
            <div className="rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-200 max-w-[240px] shadow-lg">
              {highlight.comment}
            </div>
          ),
        }
      : undefined

  const component = (
    <TextHighlight
      isScrolledTo={isScrolledTo || highlight.id === scrolledToHighlightId}
      highlight={highlight}
      style={{
        background: highlight.color || DEFAULT_COLOR,
      }}
    />
  )

  if (highlightTip) {
    return (
      <MonitoredHighlightContainer
        highlightTip={highlightTip}
        key={highlight.id}
      >
        {component}
      </MonitoredHighlightContainer>
    )
  }

  return component
}
