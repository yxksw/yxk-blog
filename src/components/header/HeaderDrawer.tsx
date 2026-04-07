import { menus } from '@/config.json'
import { createContext, useContext, useState, forwardRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Icon } from '@iconify/react'
import { clsx } from 'clsx'

const contentVariants: Variants = {
  hidden: {
    x: '100%',
    transition: {
      duration: 0.2,
      ease: [0, 0, 0.2, 1],
    },
  },
  visible: {
    x: 0,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
      duration: 0.2,
      ease: [0, 0, 0.2, 1],
    },
  },
}

const menuItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: '100%',
  },
  visible: {
    opacity: 1,
    x: 0,
  },
}

interface MenuItem {
  name: string
  link: string
  icon: string
  children?: MenuItem[]
}

export function HeaderDrawer({ zIndex = 999 }: { zIndex?: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const overlayZIndex = zIndex - 1
  const contentZIndex = zIndex

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <TriggerButton />
      </Dialog.Trigger>

      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-gray-800/40 data-[state=closed]:pointer-events-none"
                style={{ zIndex: overlayZIndex }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { delay: 0.1 } }}
              ></motion.div>
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className="fixed right-0 inset-y-0 h-full bg-primary rounded-l-lg p-4 flex flex-col justify-center w-[200px] max-w-[80%] data-[state=closed]:pointer-events-none"
                style={{ zIndex: contentZIndex }}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <DrawerContext.Provider
                  value={{
                    dismiss() {
                      setIsOpen(false)
                    },
                  }}
                >
                  <DrawerContentImpl />
                </DrawerContext.Provider>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

const TriggerButton = forwardRef<HTMLButtonElement>((props, ref) => {
  return (
    <button
      ref={ref}
      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary/50 transition-colors text-secondary hover:text-primary"
      type="button"
      aria-label="Open menu"
      {...props}
    >
      <Icon icon="ri:menu-line" className="text-xl" />
    </button>
  )
})

function DrawerContentImpl() {
  const { dismiss } = useContext(DrawerContext)
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())

  const menuIconMap: Record<string, string> = {
    'icon-pantone': 'ri:pantone-line',
    'icon-archive': 'ri:archive-line',
    'icon-flask': 'ri:flask-line',
    'icon-ghost': 'ri:ghost-line',
    'icon-hearts': 'ri:heart-2-line',
    'icon-film': 'ri:film-line',
    'icon-chat': 'ri:chat-1-line',
    'icon-image': 'ri:image-line',
  'icon-tools': 'lucide:tool-case',
  }

  // 获取图标，支持 iconify 格式和自定义映射
  const getIcon = (icon: string): string => {
    // 如果是 iconify 格式（如 ri:build-line）
    if (icon.includes(':')) {
      return icon
    }
    // 否则从映射表中获取
    return menuIconMap[icon] || 'ri:links-line'
  }

  const toggleMenu = (menuName: string) => {
    const newExpanded = new Set(expandedMenus)
    if (newExpanded.has(menuName)) {
      newExpanded.delete(menuName)
    } else {
      newExpanded.add(menuName)
    }
    setExpandedMenus(newExpanded)
  }

  return (
    <ul className="mt-8 pb-8 overflow-y-auto overflow-x-hidden min-h-0 flex flex-col">
      {menus.map((menu: MenuItem) => (
        <motion.li key={menu.name} variants={menuItemVariants}>
          {menu.children ? (
            <div className="flex flex-col">
              <button
                type="button"
                className="inline-flex items-center justify-between p-2 w-full text-left"
                onClick={() => toggleMenu(menu.name)}
              >
                <div className="inline-flex items-center space-x-3">
                  <span className="w-6 h-6 flex items-center justify-center">
                    <Icon
                      icon={getIcon(menu.icon)}
                      className="w-5 h-5"
                    />
                  </span>
                  <span>{menu.name}</span>
                </div>
                <Icon
                  icon={expandedMenus.has(menu.name) ? 'ri:arrow-down-s-line' : 'ri:arrow-right-s-line'}
                  className="text-lg opacity-60"
                />
              </button>
              
              <AnimatePresence>
                {expandedMenus.has(menu.name) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-8 flex flex-col border-l border-border ml-4">
                      {menu.children.map((child) => (
                        <a
                          key={child.name}
                          className="inline-flex items-center p-2 space-x-3 text-secondary hover:text-accent transition-colors"
                          href={child.link}
                          onClick={dismiss}
                        >
                          <span className="w-6 h-6 flex items-center justify-center">
                            <Icon
                              icon={getIcon(child.icon)}
                              className="w-5 h-5"
                            />
                          </span>
                          <span>{child.name}</span>
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <a className="inline-flex items-center p-2 space-x-3" href={menu.link} onClick={dismiss}>
              <span className="w-6 h-6 flex items-center justify-center">
                <Icon
                  icon={getIcon(menu.icon)}
                  className="w-5 h-5"
                />
              </span>
              <span>{menu.name}</span>
            </a>
          )}
        </motion.li>
      ))}
    </ul>
  )
}

const DrawerContext = createContext<{ dismiss(): void }>(null!)
