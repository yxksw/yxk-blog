import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
  // 直接获取 RSSHub 的 RSS 数据并解析
  const rssUrl = 'https://rsshub.261770.xyz/jike/user/07152f0c-0f65-4501-855b-031f3e20e4a5'

  try {
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch RSS' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    const rssXml = await response.text()

    // 解析 RSS XML 为 JSON
    const items = parseRSS(rssXml)

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('Error fetching RSS:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}

// 简单的 RSS XML 解析函数
function parseRSS(xml: string): Array<{
  title: string
  description: string
  link: string
  pubDate: string
  guid: string
}> {
  const items: Array<{
    title: string
    description: string
    link: string
    pubDate: string
    guid: string
  }> = []

  // 提取 item 元素
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1]

    const title = extractTag(itemContent, 'title')
    const description = extractTag(itemContent, 'description')
    const link = extractTag(itemContent, 'link')
    const pubDate = extractTag(itemContent, 'pubDate')
    const guid = extractTag(itemContent, 'guid')

    items.push({
      title,
      description,
      link,
      pubDate,
      guid: guid || link,
    })
  }

  return items
}

function extractTag(content: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i')
  const match = content.match(regex)
  return match ? match[1].trim() : ''
}
