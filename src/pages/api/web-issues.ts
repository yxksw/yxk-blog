import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
  // 使用 Gitee API 直接获取 Issues
  const GITEE_TOKEN = import.meta.env.PUBLIC_GITEE_TOKEN || ''
  const GITEE_OWNER = import.meta.env.PUBLIC_GITEE_OWNER || 'kemiaoshiwo'
  const GITEE_REPO = import.meta.env.PUBLIC_GITEE_REPO || 'main'

  const apiUrl = `https://gitee.com/api/v5/repos/${GITEE_OWNER}/${GITEE_REPO}/issues?state=all&per_page=20${GITEE_TOKEN ? '&access_token=' + GITEE_TOKEN : ''}`

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Gitee API Error:', response.status, text)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch from Gitee API', details: text }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    const issues = await response.json()

    return new Response(JSON.stringify(issues), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('Error fetching Gitee issues:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}
