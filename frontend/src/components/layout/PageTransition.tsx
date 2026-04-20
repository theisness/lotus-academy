'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * PageTransition — 全局页面过渡动画包装器
 *
 * 为所有页面内容添加 fade + slide-up 入场动画。
 * 使用 Spring 物理引擎，遵循 taste.md 规范。
 * 必须作为独立的 'use client' 叶子组件。
 */

const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 20,
    },
  },
}

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  )
}
