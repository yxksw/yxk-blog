import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
  // 获取预生成的 Gitee Issues JSON 数据
  const jsonUrl =
    'https://gitee-json.261770.xyz/v2/api/v5/repos/kemiaoshiwo/main/issues%3Fstate%3Dall%26per_page%3D20/data.json'

  try {
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch JSON' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    const jsonData = await response.json()

    return new Response(JSON.stringify(jsonData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10', // 10秒缓存
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
