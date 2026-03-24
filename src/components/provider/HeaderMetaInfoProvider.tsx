import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { pathNameAtom, metaTitleAtom, metaDescriptionAtom, metaSlugAtom } from '@/store/metaInfo'

const DEV = import.meta.env.DEV

function normalizePath(value: string) {
  if (!value) return '/'
  if (value === '/') return value
  return value.replace(/\/+$/, '')
}

export function HeaderMetaInfoProvider({
  pathName,
  title = '',
  description = '',
  slug = '',
}: {
  pathName: string
  title?: string
  description?: string
  slug?: string
}) {
  const setPathName = useSetAtom(pathNameAtom)
  const setTitle = useSetAtom(metaTitleAtom)
  const setDescription = useSetAtom(metaDescriptionAtom)
  const setSlug = useSetAtom(metaSlugAtom)

  useEffect(() => {
    const normalized = normalizePath(pathName)
    if (DEV) console.log('[header:path:init-prop]', { pathName, normalized })
    setPathName(normalized)
    setTitle(title)
    setDescription(description)
    setSlug(slug)
  }, [pathName, title, description, slug, setDescription, setPathName, setSlug, setTitle])

  useEffect(() => {
    const syncPathFromLocation = (source: string) => {
      const pathname = window.location.pathname
      const normalized = normalizePath(pathname)
      if (DEV) console.log('[header:path:event]', { source, pathname, normalized })
      setPathName(normalized)
    }

    const onPopstate = () => syncPathFromLocation('popstate')
    const onAstroPageLoad = () => syncPathFromLocation('astro:page-load')
    const onSwupReplace = () => syncPathFromLocation('swup:content:replace')
    const onSwupReplaced = () => syncPathFromLocation('swup:contentReplaced')

    syncPathFromLocation('mount')
    window.addEventListener('popstate', onPopstate)
    document.addEventListener('astro:page-load', onAstroPageLoad)
    document.addEventListener('swup:content:replace', onSwupReplace)
    document.addEventListener('swup:contentReplaced', onSwupReplaced)

    return () => {
      window.removeEventListener('popstate', onPopstate)
      document.removeEventListener('astro:page-load', onAstroPageLoad)
      document.removeEventListener('swup:content:replace', onSwupReplace)
      document.removeEventListener('swup:contentReplaced', onSwupReplaced)
    }
  }, [setPathName])

  return null
}
