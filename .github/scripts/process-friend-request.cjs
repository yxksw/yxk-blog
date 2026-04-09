const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

const FRIENDS_FILE = path.join(process.cwd(), 'src/content/friends/friends.ts')

// 检查 URL 可达性（带重试）
async function checkUrl(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await checkUrlOnce(url)
      if (result.success) {
        return { success: true, statusCode: result.statusCode }
      }
      // 最后一次重试失败
      if (i === retries - 1) {
        return { success: false, error: result.error, statusCode: result.statusCode }
      }
      // 等待 2 秒后重试
      await sleep(2000)
    } catch (error) {
      if (i === retries - 1) {
        return { success: false, error: error.message }
      }
      await sleep(2000)
    }
  }
  return { success: false, error: 'Max retries exceeded' }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function checkUrlOnce(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, { timeout: 10000 }, (res) => {
      const statusCode = res.statusCode
      // 2xx 和 3xx 都认为成功
      if (statusCode >= 200 && statusCode < 400) {
        resolve({ success: true, statusCode })
      } else {
        resolve({ success: false, statusCode, error: `HTTP ${statusCode}` })
      }
    })

    req.on('error', (error) => {
      resolve({ success: false, error: error.message })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({ success: false, error: 'Timeout' })
    })
  })
}

// 解析 issue body
function parseIssueBody(body) {
  const data = {}
  const lines = body.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith('### 网站名称')) {
      data.title = lines[i + 2]?.trim() || ''
    } else if (line.startsWith('### 头像链接')) {
      data.avatar = lines[i + 2]?.trim() || ''
    } else if (line.startsWith('### 网站描述')) {
      data.description = lines[i + 2]?.trim() || ''
    } else if (line.startsWith('### 网站链接')) {
      data.link = lines[i + 2]?.trim() || ''
    } else if (line.startsWith('### RSS 链接')) {
      const rssLine = lines[i + 2]?.trim() || ''
      data.rss = rssLine && !rssLine.includes('_No response_') ? rssLine : undefined
    }
  }

  return data
}

// 验证数据
function validateData(data) {
  const errors = []

  if (!data.title) errors.push('网站名称不能为空')
  if (!data.avatar) errors.push('头像链接不能为空')
  if (!data.description) errors.push('网站描述不能为空')
  if (!data.link) errors.push('网站链接不能为空')

  // 验证 URL 格式
  if (data.avatar && !isValidUrl(data.avatar)) {
    errors.push('头像链接格式不正确')
  }
  if (data.link && !isValidUrl(data.link)) {
    errors.push('网站链接格式不正确')
  }
  if (data.rss && !isValidUrl(data.rss)) {
    errors.push('RSS 链接格式不正确')
  }

  return errors
}

function isValidUrl(string) {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

// 检查链接可达性
async function checkLinks(data) {
  const results = []

  // 检查头像链接
  const avatarResult = await checkUrl(data.avatar)
  if (!avatarResult.success) {
    results.push({ field: '头像链接', url: data.avatar, ...avatarResult })
  }

  // 检查网站链接
  const linkResult = await checkUrl(data.link)
  if (!linkResult.success) {
    results.push({ field: '网站链接', url: data.link, ...linkResult })
  }

  return results
}

// 添加到 friends.ts
function addToFriends(data, tags = ['友链']) {
  let content = fs.readFileSync(FRIENDS_FILE, 'utf-8')

  // 构建新的友链对象
  const newFriend = {
    title: data.title,
    avatar: data.avatar,
    description: data.description,
    link: data.link,
    ...(data.rss && { rss: data.rss }),
    tags: tags,
  }

  // 转换为字符串格式
  const friendStr = `  {
    title: '${escapeString(newFriend.title)}',
    avatar: '${escapeString(newFriend.avatar)}',
    description: '${escapeString(newFriend.description)}',
    link: '${escapeString(newFriend.link)}',${
      newFriend.rss
        ? `
    rss: '${escapeString(newFriend.rss)}',`
        : ''
    }
    tags: [${newFriend.tags.map((t) => `'${escapeString(t)}'`).join(', ')}],
  },`

  // 在数组末尾插入（在最后一个 } 之前）
  const lastBracketIndex = content.lastIndexOf(']')
  if (lastBracketIndex === -1) {
    throw new Error('无法找到数组结束位置')
  }

  content = content.slice(0, lastBracketIndex) + friendStr + '\n' + content.slice(lastBracketIndex)

  fs.writeFileSync(FRIENDS_FILE, content)
  return true
}

function escapeString(str) {
  return str.replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

// 主函数
async function main() {
  const issueBody = process.env.ISSUE_BODY
  const issueNumber = process.env.ISSUE_NUMBER

  if (!issueBody) {
    console.log('No issue body provided')
    process.exit(1)
  }

  console.log('Parsing issue body...')
  const data = parseIssueBody(issueBody)
  console.log('Parsed data:', JSON.stringify(data, null, 2))

  // 验证数据
  const validationErrors = validateData(data)
  if (validationErrors.length > 0) {
    console.log('Validation errors:', validationErrors)
    console.log('::set-output name=result::invalid')
    console.log('::set-output name=errors::' + validationErrors.join(', '))
    process.exit(0)
  }

  // 检查链接可达性
  console.log('Checking link reachability...')
  const failedChecks = await checkLinks(data)

  if (failedChecks.length > 0) {
    console.log('Link check failed:', failedChecks)
    const errorMessages = failedChecks.map(
      (f) => `${f.field} (${f.url}): ${f.error}${f.statusCode ? ` (HTTP ${f.statusCode})` : ''}`,
    )
    console.log('::set-output name=result::unreachable')
    console.log('::set-output name=errors::' + errorMessages.join('; '))
    process.exit(0)
  }

  // 添加到 friends.ts
  console.log('Adding to friends.ts...')
  try {
    addToFriends(data)
    console.log('Successfully added to friends.ts')
    console.log('::set-output name=result::success')
    console.log('::set-output name=title::' + data.title)
  } catch (error) {
    console.error('Failed to add to friends.ts:', error)
    console.log('::set-output name=result::error')
    console.log('::set-output name=errors::' + error.message)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
