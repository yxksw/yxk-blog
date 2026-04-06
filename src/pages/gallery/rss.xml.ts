import type { APIContext } from 'astro'
import rss from '@astrojs/rss'
import { site } from '@/config.json'
import { getCollection } from 'astro:content'

export async function GET(context: APIContext) {
  const photosCollection = await getCollection('photos')
  const allPhotos = photosCollection.flatMap((entry) => entry.data)

  const sortedPhotos = allPhotos
    .map((photo) => ({
      ...photo,
      date: photo.date ? new Date(photo.date) : new Date(0),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 20)

  const customData = `
    <language>${site.lang}</language>
  `

  return rss({
    title: `${site.title} - Gallery@相册`,
    description: '记录生活中的美好瞬间，分享旅途中的风景。',
    site: context.site!,
    items: sortedPhotos.map((photo) => ({
      link: photo.url,
      title: photo.name || 'Gallery@相册',
      pubDate: photo.date,
      description: `<img src="${photo.url}" alt="${photo.name || ''}" />
        ${photo.description ? `<p>${photo.description}</p>` : ''} 
        ${photo.location ? `<p>拍摄于${photo.location}</p>` : ''}
        ${Array.isArray(photo.tag) && photo.tag.length > 0 ? `<p>标签：${photo.tag.join(', ')}</p>` : ''}`,
    })),
    customData,
  })
}
