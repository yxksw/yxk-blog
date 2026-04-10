import { useAtomValue } from 'jotai'
import { useEffect, useState, useRef } from 'react'
import { pageScrollLocationAtom } from '@/store/scrollInfo'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import '@/icons/registerRi'

export function FloatingActions() {
  const scrollY = useAtomValue(pageScrollLocationAtom)
  const isShow = scrollY > 100
  const [hasComments, setHasComments] = useState(false)
  const [hasNotification, setHasNotification] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => {
      setHasComments(!!document.getElementById('comments'))
      // Check if notification component exists and has content
      const notifEl = document.getElementById('new-post-notification')
      setHasNotification(!!notifEl)
    }
    check()
    const handler = () => setTimeout(check, 0)
    document.addEventListener('swup:content:replace', handler)
    return () => document.removeEventListener('swup:content:replace', handler)
  }, [])

  // Trigger notification panel when FAB is clicked
  const handleNotificationClick = () => {
    const minimizedBtn = document.getElementById('notification-minimized') as HTMLButtonElement
    if (minimizedBtn) {
      minimizedBtn.click()
    }
  }

  return (
    <div className="fixed right-4 bottom-6 z-10">
      <AnimatePresence>{isShow && (
        <div className="flex flex-col gap-3 items-end">
          {hasNotification && (
            <motion.button
              id="notification-fab"
              className="size-10 rounded-full shadow-lg shadow-zinc-800/5 border border-primary bg-white/50 dark:bg-zinc-800/50 backdrop-blur cursor-pointer"
              type="button"
              aria-label="New post notification"
              onClick={handleNotificationClick}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              <Icon icon="ri:notification-3-line" />
            </motion.button>
          )}
          {hasComments && (
            <motion.button
              className="size-10 rounded-full shadow-lg shadow-zinc-800/5 border border-primary bg-white/50 dark:bg-zinc-800/50 backdrop-blur cursor-pointer"
              type="button"
              aria-label="Go to comments"
              onClick={handleScrollToComments}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              <Icon icon="ri:chat-1-line" />
            </motion.button>
          )}
          <motion.button
            className="size-10 rounded-full shadow-lg shadow-zinc-800/5 border border-primary bg-white/50 dark:bg-zinc-800/50 backdrop-blur cursor-pointer"
            type="button"
            aria-label="Back to top"
            onClick={handleBackToTop}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            <Icon icon="ri:rocket-2-line" />
          </motion.button>
        </div>
      )}</AnimatePresence>
      {/* Container for notification panel */}
      <div ref={notificationRef} id="notification-container" className="absolute bottom-0 right-0" />
    </div>
  )
}

function handleBackToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

function handleScrollToComments() {
  const el = document.getElementById('comments')
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: 'smooth' })
}
