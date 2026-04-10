import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { PostToc } from './PostToc'
import type { MarkdownHeading } from 'astro'

interface MobileTocButtonProps {
  headings: MarkdownHeading[]
}

export function MobileTocButton({ headings }: MobileTocButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleOpen = () => {
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  // 只在客户端渲染时检查是否有目录项
  if (headings.length === 0) return null

  return (
    <>
      {/* 目录按钮 - 放在通知按钮上方 */}
      <motion.button
        id="mobile-toc-button"
        className="size-10 rounded-full shadow-lg shadow-zinc-800/5 border border-primary bg-white/50 dark:bg-zinc-800/50 backdrop-blur cursor-pointer"
        type="button"
        aria-label="Open table of contents"
        onClick={handleOpen}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
      >
        <Icon icon="ri:list-unordered" />
      </motion.button>

      {/* 目录面板 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          {/* 目录内容 */}
          <motion.div
            className="relative w-full max-w-md max-h-[70vh] bg-[rgb(var(--color-bg-card))] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* 顶部栏 */}
            <div className="flex items-center justify-between p-4 border-b border-primary/10">
              <h3 className="font-bold text-lg text-[rgb(var(--color-text))]">目录</h3>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-[rgb(var(--color-primary))]/10 transition-colors"
                aria-label="Close table of contents"
              >
                <Icon icon="ri:close-line" className="text-[rgb(var(--color-text))]" />
              </button>
            </div>
            
            {/* 目录列表 */}
            <div className="p-4 overflow-y-auto max-h-[calc(70vh-80px)]">
              <PostToc headings={headings} />
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
