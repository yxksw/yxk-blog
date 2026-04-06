import type { APIContext } from 'astro'
import rss from '@astrojs/rss'
import { site } from '@/config.json'
import { getSortedPosts, getEntrySlug } from '@/utils/content'
import { render } from 'astro:content'

export async function GET(context: APIContext) {
  const sortedPosts = await getSortedPosts()
  const filteredPosts = sortedPosts.filter((post) => !post.data.unlisted)

  const items = await Promise.all(
    filteredPosts.map(async (post) => {
      const { Content } = await render(post)
      // Get the rendered HTML content
      const content = typeof post.body === 'string' ? post.body : ''

      return {
        link: `/posts/${getEntrySlug(post)}`,
        title: post.data.title,
        pubDate: post.data.date,
        description: post.data.summary,
        // Add content:encoded for full article content
        customData: content ? `<content:encoded><![CDATA[${content}]]></content:encoded>` : '',
      }
    }),
  )

  return rss({
    title: site.title,
    description: site.description,
    site: context.site!,
    items,
    customData: `<language>${site.lang}</language><atom:link href="${context.site}rss.xml" rel="self" type="application/rss+xml" />`,
    xmlns: {
      content: 'http://purl.org/rss/1.0/modules/content/',
      atom: 'http://www.w3.org/2005/Atom',
    },
  })
}
