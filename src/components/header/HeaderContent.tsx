import { useState } from 'react'
import { menus } from '@/config.json'
import { clsx } from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import {
  usePathName,
  useShouldAccessibleMenuShow,
  useShouldHeaderMenuBgShow,
  useShouldHeaderMetaShow,
} from './hooks'
import { RootPortal } from '@/components/RootPortal'
import { Icon } from '@iconify/react'
import '@/icons/registerRi'
import ColumnHover from './ColumnHover'

interface MenuItem {
  name: string
  link: string
  icon: string
  children?: MenuItem[]
}

const typedMenus = menus as MenuItem[]

export function HeaderContent() {
  return (
    <>
      <AnimatedMenu />
      <AccessibleMenu />
    </>
  )
}

function AnimatedMenu() {
  const shouldBgShow = useShouldHeaderMenuBgShow()
  const shouldHeaderMetaShow = useShouldHeaderMetaShow()

  return (
    <AnimatePresence>
      {!shouldHeaderMetaShow && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <HeaderMenu isBgShow={shouldBgShow} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AccessibleMenu() {
  const shouldShow = useShouldAccessibleMenuShow()

  return (
    <RootPortal>
      <AnimatePresence>
        {shouldShow && (
          <motion.div
            className="fixed z-[100] top-[64px] inset-x-0 flex justify-center pointer-events-none"
            initial={{ y: '-50%', opacity: 0 }}
            animate={{ y: '-50%', opacity: 1 }}
            exit={{ y: '-50%', opacity: 0 }}
          >
            <HeaderMenu isBgShow />
          </motion.div>
        )}
      </AnimatePresence>
    </RootPortal>
  )
}

function normalizePath(value: string) {
  if (!value) return '/'
  const cleaned = value.replace(/[?#].*$/, '').replace(/\/+$/, '')
  return cleaned === '' ? '/' : cleaned
}

function HeaderMenu({ isBgShow }: { isBgShow: boolean }) {
  const pathName = usePathName()
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)
  const [radius, setRadius] = useState(0)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const currentPath = normalizePath(pathName || '/')
  const isMenuActive = (href: string) => {
    const target = normalizePath(href)
    if (target === '/') return currentPath === '/'
    return currentPath === target || currentPath.startsWith(`${target}/`)
  }

  const isMenuOrChildActive = (menu: MenuItem) => {
    if (isMenuActive(menu.link)) return true
    if (menu.children) {
      return menu.children.some(child => isMenuActive(child.link))
    }
    return false
  }

  const background = `radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, rgb(var(--color-accent) / 0.12) 0%, transparent 65%)`

  const handleMouseMove = ({ clientX, clientY, currentTarget }: React.MouseEvent) => {
    const bounds = currentTarget.getBoundingClientRect()
    setMouseX(clientX - bounds.left)
    setMouseY(clientY - bounds.top)
    setRadius(Math.sqrt(bounds.width ** 2 + bounds.height ** 2) / 2.5)
  }

  return (
    <nav
      className={clsx('relative rounded-full group pointer-events-auto duration-200', {
        'bg-gradient-to-b from-zinc-50/70 to-white/90 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur-md dark:from-zinc-900/70 dark:to-zinc-800/90 dark:ring-zinc-100/10':
          isBgShow,
      })}
      onMouseMove={handleMouseMove}
    >
      <div
        className="absolute -z-1 -inset-px rounded-full opacity-0 group-hover:opacity-100 duration-500"
        style={{ background }}
        aria-hidden
      ></div>
      <div className="text-sm px-4 flex">
        {typedMenus.map((menu) => (
          <div
            key={menu.name}
            className="relative"
            onMouseEnter={() => menu.children && setOpenDropdown(menu.name)}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <HeaderMenuItem
              href={menu.link}
              title={menu.name}
              icon={menu.icon}
              isActive={isMenuOrChildActive(menu)}
              hasChildren={!!menu.children}
            />
            
            {/* 下拉子菜单 */}
            <AnimatePresence>
              {menu.children && openDropdown === menu.name && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 pt-2"
                >
                  <div className="bg-gradient-to-b from-zinc-50/95 to-white/95 dark:from-zinc-900/95 dark:to-zinc-800/95 shadow-lg shadow-zinc-800/10 ring-1 ring-zinc-900/5 dark:ring-zinc-100/10 backdrop-blur-md rounded-xl py-2 min-w-[140px]">
                    {menu.children.map((child) => (
                      <a
                        key={child.name}
                        href={child.link}
                        className={clsx(
                          'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                          isMenuActive(child.link)
                            ? 'text-accent bg-accent/10'
                            : 'text-secondary hover:text-accent hover:bg-secondary/50'
                        )}
                      >
                        <Icon icon={menuIconMap[child.icon] ?? 'ri:links-line'} className="text-sm" />
                        <span>{child.name}</span>
                      </a>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </nav>
  )
}

const menuIconMap: Record<string, string> = {
  'icon-pantone': 'ri:pantone-line',
  'icon-archive': 'ri:archive-line',
  'icon-flask': 'ri:flask-line',
  'icon-ghost': 'ri:ghost-line',
  'icon-hearts': 'ri:heart-2-line',
  'icon-film': 'ri:film-line',
  'icon-chat': 'ri:chat-1-line',
}

function HeaderMenuItem({
  href,
  isActive,
  title,
  icon,
  hasChildren,
}: {
  href: string
  isActive: boolean
  title: string
  icon: string
  hasChildren?: boolean
}) {
  const handleMemosClick =
    href === '/memos'
      ? () => {
          const once = () => {
            document.removeEventListener('swup:content:replace', once as any)
            if (location.pathname.startsWith('/memos')) {
              ;(window as any).__MEMOS_PAGE_INITED__ = true
              import('@/scripts/memos-runtime.ts').then((m) =>
                m.default ? m.default() : undefined,
              )
            }
          }
          document.addEventListener('swup:content:replace', once as any)
        }
      : undefined

  const Link = (
    <a
      className={clsx('relative block px-4 py-1.5', isActive ? 'text-accent' : 'hover:text-accent')}
      href={href}
      onClick={handleMemosClick}
    >
      <div className="flex items-center space-x-1">
        {isActive && (
          <motion.span initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <Icon icon={menuIconMap[icon] ?? 'ri:links-line'} />
          </motion.span>
        )}
        <span>{title}</span>
        {hasChildren && (
          <Icon icon="ri:arrow-down-s-line" className="text-xs opacity-60" />
        )}
      </div>
      {isActive && (
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent"></div>
      )}
    </a>
  )

  if (href === '/columns') return <ColumnHover>{Link}</ColumnHover>
  return Link
}
