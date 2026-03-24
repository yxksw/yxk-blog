import { getCollection } from 'astro:content'
import columnSortConfig from '@/content/column-sort.json'

function toTimestamp(date?: Date) {
  return date instanceof Date ? date.valueOf() : 0
}

export function getEntryPath(entry: { id: string; filePath?: string }) {
  const rawPath = String(entry.filePath ?? entry.id).replace(/\\/g, '/')
  const withoutExt = rawPath.replace(/\.(md|mdx)$/i, '')
  return withoutExt
    .replace(/^\.?\/*src\/content\/[^/]+\//i, '')
    .replace(/^\.?\/*(?:posts|spec|friends|projects)\//i, '')
}

export function getEntrySlug(entry: { id: string; filePath?: string; data?: unknown }) {
  const slug = (entry.data as { slug?: string | number } | undefined)?.slug
  return String(slug ?? getEntryPath(entry))
}

async function getAllPosts() {
  return getCollection('posts', ({ data }) => {
    if (import.meta.env.PROD && data.draft) return false
    return true
  })
}

export async function getPublicPosts() {
  return getCollection('posts', ({ data }) => {
    if (import.meta.env.PROD && data.draft) return false
    if (data.unlisted) return false
    return true
  })
}

async function getNewestPosts() {
  const allPosts = await getPublicPosts()
  return allPosts.sort(
    (a, b) => toTimestamp(a.data.date as Date) - toTimestamp(b.data.date as Date),
  )
}

export async function getOldestPosts() {
  const allPosts = await getPublicPosts()
  return allPosts.sort(
    (a, b) => toTimestamp(b.data.date as Date) - toTimestamp(a.data.date as Date),
  )
}

export async function getSortedPosts() {
  const allPosts = await getPublicPosts()
  return allPosts.sort((a, b) => {
    if (a.data.sticky !== b.data.sticky) return b.data.sticky - a.data.sticky
    return toTimestamp(b.data.date as Date) - toTimestamp(a.data.date as Date)
  })
}

export async function getAllPostsWordCount() {
  const allPosts = await getPublicPosts()
  return allPosts.reduce((count, post) => count + countPostWords(post.body ?? ''), 0)
}

function countPostWords(body: string) {
  const plainText = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[\[[^\]]+\]\]/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[\[[^\]]+\]\]/g, ' ')
    .replace(/\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~\-|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const cjkChars =
    plainText.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)
      ?.length ?? 0
  const latinWords =
    plainText
      .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, ' ')
      .match(/[A-Za-z0-9_]+/g)?.length ?? 0

  return cjkChars + latinWords
}

export function slugify(text: string) {
  return text.replace(/\./g, '').replace(/\s/g, '-').toLowerCase()
}

export async function getAllCategories() {
  const newestPosts = await getNewestPosts()
  return newestPosts.reduce<{ slug: string; name: string; count: number }[]>((acc, cur) => {
    if (!cur.data.category) return acc
    const slug = slugify(cur.data.category)
    const index = acc.findIndex((category) => category.slug === slug)
    if (index === -1) {
      acc.push({ slug, name: cur.data.category, count: 1 })
    } else {
      acc[index].count += 1
    }
    return acc
  }, [])
}

export async function getAllTags() {
  const newestPosts = await getNewestPosts()
  return newestPosts.reduce<{ slug: string; name: string; count: number }[]>((acc, cur) => {
    cur.data.tags.forEach((tag) => {
      const slug = slugify(tag)
      const index = acc.findIndex((item) => item.slug === slug)
      if (index === -1) {
        acc.push({ slug, name: tag, count: 1 })
      } else {
        acc[index].count += 1
      }
    })
    return acc
  }, [])
}

export async function getHotTags(len = 5) {
  const allTags = await getAllTags()
  return allTags.sort((a, b) => b.count - a.count).slice(0, len)
}

export async function getColumnsFromFolder(folderNames: string[] = ['专栏', 'column']) {
  const all = await getAllPosts()
  type Item = { slug: string; title: string; index?: string; level: number }
  type Column = { slug: string; title: string; base: string; items: Item[] }
  type ColumnSortConfig = {
    columnOrder?: string[]
    postOrder?: Record<string, string[]>
  }

  const sortConfig = (columnSortConfig || {}) as ColumnSortConfig
  const normalizeKey = (v?: string) => (v || '').trim().toLowerCase()
  const map = new Map<string, Column>()

  const parseIndex = (idx?: string) =>
    idx
      ? idx
          .split('.')
          .map((n) => Number(n))
          .filter((n) => !Number.isNaN(n))
      : []

  for (const p of all) {
    const entryPath = getEntryPath(p)
    const segs = entryPath.split('/')
    if (segs.length < 2) continue

    const root = segs[0]
    if (!folderNames.includes(root)) continue

    const colTitle = segs[1]
    const base = `${root}/${colTitle}`
    const colSlug = slugify(colTitle)

    if (!map.has(base)) {
      map.set(base, { slug: colSlug, title: colTitle, base, items: [] })
    }

    map.get(base)!.items.push({
      slug: entryPath,
      title: p.data.title,
      index: (p.data as any).index,
      level: (p.data as any).index ? String((p.data as any).index).split('.').length : 1,
    })
  }

  const sortByConfiguredOrder = (items: Item[], order: string[] = []) => {
    if (!order.length) return items
    const rank = new Map<string, number>()
    order.forEach((slug, i) => rank.set(slug, i))

    return [...items].sort((a, b) => {
      const aSeg = a.slug.split('/').pop()!
      const bSeg = b.slug.split('/').pop()!
      const ar = rank.get(a.slug) ?? rank.get(aSeg) ?? Number.MAX_SAFE_INTEGER
      const br = rank.get(b.slug) ?? rank.get(bSeg) ?? Number.MAX_SAFE_INTEGER
      if (ar !== br) return ar - br
      return 0
    })
  }

  const res = Array.from(map.values()).map((c) => {
    c.items = c.items.sort((a, b) => {
      const ai = parseIndex((all.find((e) => getEntryPath(e) === a.slug)?.data as any)?.index)
      const bi = parseIndex((all.find((e) => getEntryPath(e) === b.slug)?.data as any)?.index)
      const len = Math.max(ai.length, bi.length)

      for (let i = 0; i < len; i++) {
        const av = ai[i] ?? 0
        const bv = bi[i] ?? 0
        if (av !== bv) return av - bv
      }

      const pa = all.find((e) => getEntryPath(e) === a.slug)
      const pb = all.find((e) => getEntryPath(e) === b.slug)
      return toTimestamp(pa?.data.date as Date) - toTimestamp(pb?.data.date as Date)
    })

    const postOrderByTitle = sortConfig.postOrder?.[c.title]
    const postOrderBySlug = sortConfig.postOrder?.[c.slug]
    c.items = sortByConfiguredOrder(c.items, postOrderByTitle || postOrderBySlug)
    return c
  })

  const columnRank = new Map<string, number>()
  ;(sortConfig.columnOrder || []).forEach((nameOrSlug, i) =>
    columnRank.set(normalizeKey(nameOrSlug), i),
  )

  res.sort((a, b) => {
    const ar =
      columnRank.get(normalizeKey(a.title)) ??
      columnRank.get(normalizeKey(a.slug)) ??
      Number.MAX_SAFE_INTEGER
    const br =
      columnRank.get(normalizeKey(b.title)) ??
      columnRank.get(normalizeKey(b.slug)) ??
      Number.MAX_SAFE_INTEGER
    if (ar !== br) return ar - br
    return a.title.localeCompare(b.title, 'zh-CN')
  })

  return res
}
