import { useAtomValue, useSetAtom } from 'jotai'
import { Modal } from './Modal'
import { modalStackAtom } from '@/store/modalStack'
import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'

export function ModalStack() {
  const modalStack = useAtomValue(modalStackAtom)
  const setModalStack = useSetAtom(modalStackAtom)

  useEffect(() => {
    const clearModals = () => setModalStack([])
    document.addEventListener('swup:content:replace', clearModals)
    document.addEventListener('astro:page-load', clearModals)
    window.addEventListener('popstate', clearModals)
    return () => {
      document.removeEventListener('swup:content:replace', clearModals)
      document.removeEventListener('astro:page-load', clearModals)
      window.removeEventListener('popstate', clearModals)
    }
  }, [setModalStack])

  return (
    <AnimatePresence>
      {modalStack.map((modal, index) => (
        <Modal key={modal.id} index={index} id={modal.id}>
          {modal.content}
        </Modal>
      ))}
    </AnimatePresence>
  )
}
