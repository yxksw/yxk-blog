import type { APIContext } from 'astro'
import rss from '@astrojs/rss'
import { site } from '@/config.json'
import { getSortedPosts, getEntryPath, getEntrySlug, slugify } from '@/utils/content'

function getRssItemLink(post: { id: string; filePath?: string; data?: unknown }) {
  const entryPath = getEntryPath(post)
  const segs = entryPath.split('/')
  if (segs.length >= 3 && (segs[0] === '专栏' || segs[0] === 'column')) {
    const columnSlug = slugify(segs[1])
    const postSeg = segs[segs.length - 1]
    return `/columns/${columnSlug}/${postSeg}`
  }
  return `/posts/${getEntrySlug(post)}`
}

export async function GET(context: APIContext) {
  const sortedPosts = await getSortedPosts()
  const filteredPosts = sortedPosts.filter((post) => !post.data.unlisted)

  return rss({
    title: site.title,
    description: site.description,
    site: context.site!,
    items: filteredPosts.map((post) => ({
      link: getRssItemLink(post),
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.summary,
    })),
    customData: `<language>${site.lang}</language>`,
  })
}
