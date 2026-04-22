/** 可用的高亮颜色 */
export const HIGHLIGHT_COLORS = [
  { name: '黄色', value: 'rgba(255, 226, 143, 0.6)' },
  { name: '绿色', value: 'rgba(166, 227, 161, 0.6)' },
  { name: '蓝色', value: 'rgba(147, 197, 253, 0.6)' },
  { name: '粉色', value: 'rgba(249, 168, 212, 0.6)' },
  { name: '橙色', value: 'rgba(253, 186, 116, 0.6)' },
] as const

export const DEFAULT_COLOR = HIGHLIGHT_COLORS[0].value
export const COLOR_STORAGE_KEY = 'reader-highlight-color'
