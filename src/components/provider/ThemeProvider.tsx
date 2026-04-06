import { useAtomValue } from 'jotai'
import { useEffect } from 'react'
import { getSystemTheme, changePageTheme, setLocalTheme } from '@/utils/theme'
import { themeAtom } from '@/store/theme'

export function ThemeProvider() {
  const theme = useAtomValue(themeAtom)

  function handlePrefersColorSchemeChange(event: MediaQueryListEvent) {
    if (theme === 'system') {
      changePageTheme(event.matches ? 'dark' : 'light')
    }
  }

  useEffect(() => {
    setLocalTheme(theme)

    if (theme === 'system') {
      const systemTheme = getSystemTheme()
      changePageTheme(systemTheme)
    } else {
      changePageTheme(theme)
    }

    // 触发自定义事件通知 Giscus 主题变化
    document.dispatchEvent(new CustomEvent('theme:change'))

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    query.addEventListener('change', handlePrefersColorSchemeChange)

    return () => {
      query.removeEventListener('change', handlePrefersColorSchemeChange)
    }
  }, [theme])

  return null
}
