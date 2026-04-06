import { useEffect, useRef } from 'react'

interface GiscusProps {
  repo: string
  repoId: string
  category: string
  categoryId: string
  mapping?: string
  strict?: string
  reactionsEnabled?: string
  emitMetadata?: string
  inputPosition?: string
  lang?: string
}

export function Giscus({
  repo,
  repoId,
  category,
  categoryId,
  mapping = 'pathname',
  strict = '0',
  reactionsEnabled = '1',
  emitMetadata = '0',
  inputPosition = 'bottom',
  lang = 'zh-CN',
}: GiscusProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    // 获取当前主题
    const getTheme = () => {
      const localTheme = localStorage.getItem('gyoza-theme')
      if (localTheme === 'dark') return 'dark'
      if (localTheme === 'light') return 'light'
      // system 或默认
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    // 创建 Giscus 脚本
    const createGiscus = () => {
      const container = ref.current
      if (!container) return

      // 清空容器
      container.innerHTML = ''

      const script = document.createElement('script')
      script.src = 'https://giscus.app/client.js'
      script.setAttribute('data-repo', repo)
      script.setAttribute('data-repo-id', repoId)
      script.setAttribute('data-category', category)
      script.setAttribute('data-category-id', categoryId)
      script.setAttribute('data-mapping', mapping)
      script.setAttribute('data-strict', strict)
      script.setAttribute('data-reactions-enabled', reactionsEnabled)
      script.setAttribute('data-emit-metadata', emitMetadata)
      script.setAttribute('data-input-position', inputPosition)
      script.setAttribute('data-theme', getTheme())
      script.setAttribute('data-lang', lang)
      script.setAttribute('crossorigin', 'anonymous')
      script.async = true

      container.appendChild(script)
    }

    // 初始化
    createGiscus()

    // 监听主题变化
    const handleThemeChange = () => {
      const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
      if (iframe) {
        const theme = getTheme()
        iframe.contentWindow?.postMessage(
          { giscus: { setConfig: { theme } } },
          'https://giscus.app'
        )
      }
    }

    // 监听 swup 页面切换事件
    document.addEventListener('swup:content:replace', handleThemeChange)
    
    // 监听自定义主题切换事件
    document.addEventListener('theme:change', handleThemeChange)

    // 监听 storage 变化（其他标签页）
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'gyoza-theme') {
        handleThemeChange()
      }
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      document.removeEventListener('swup:content:replace', handleThemeChange)
      document.removeEventListener('theme:change', handleThemeChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [repo, repoId, category, categoryId, mapping, strict, reactionsEnabled, emitMetadata, inputPosition, lang])

  return <div ref={ref} className="giscus-container" />
}
