import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
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

    const xmlText = await response.text()

    return new Response(xmlText, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}
