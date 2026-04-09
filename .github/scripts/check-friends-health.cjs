const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

const FRIENDS_FILE = path.join(process.cwd(), 'src/content/friends/friends.ts')

// 设置输出到 GITHUB_OUTPUT 环境文件
function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT
  if (outputFile) {
    fs.appendFileSync(outputFile, `${name}=${value}\n`)
  }
}

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

// 解析 friends.ts 文件
function parseFriendsFile() {
  const content = fs.readFileSync(FRIENDS_FILE, 'utf-8')

  // 提取每个友链对象
  const friends = []
  const regex =
    /\{\s*title:\s*['"]([^'"]+)['"],\s*avatar:\s*['"]([^'"]+)['"],\s*description:\s*['"]([^'"]+)['"],\s*link:\s*['"]([^'"]+)['"](?:,\s*rss:\s*['"]([^'"]*)['"])?,\s*tags:\s*\[([^\]]*)\]/g

  let match
  while ((match = regex.exec(content)) !== null) {
    friends.push({
      title: match[1],
      avatar: match[2],
      description: match[3],
      link: match[4],
      rss: match[5] || null,
      tags: match[6] ? match[6].split(',').map((t) => t.trim().replace(/['"]/g, '')) : [],
    })
  }

  return friends
}

// 检查友链健康状态
async function checkFriendHealth(friend) {
  const results = {
    title: friend.title,
    avatar: { url: friend.avatar, ...(await checkUrl(friend.avatar)) },
    link: { url: friend.link, ...(await checkUrl(friend.link)) },
  }

  results.failed = []
  if (!results.avatar.success) {
    results.failed.push({ field: 'avatar', ...results.avatar })
  }
  if (!results.link.success) {
    results.failed.push({ field: 'link', ...results.link })
  }

  results.isHealthy = results.failed.length === 0
  return results
}

// 从 friends.ts 中移除友链
function removeFromFriends(title) {
  let content = fs.readFileSync(FRIENDS_FILE, 'utf-8')

  // 构建匹配正则，找到并移除该友链对象
  const regex = new RegExp(
    `\\s*\\{\\s*title:\\s*['"\`]` + escapeRegex(title) + `['"\`][^}]+\\},?`,
    'g',
  )

  content = content.replace(regex, '')

  // 清理可能的空行和多余的逗号
  content = content.replace(/,\s*\]/g, '\n]')
  content = content.replace(/\n{3,}/g, '\n\n')

  fs.writeFileSync(FRIENDS_FILE, content)
  return true
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 主函数
async function main() {
  console.log('Loading friends data...')
  const friends = parseFriendsFile()
  console.log(`Found ${friends.length} friends`)

  const unhealthyFriends = []

  // 检查每个友链
  for (let i = 0; i < friends.length; i++) {
    const friend = friends[i]
    console.log(`\nChecking [${i + 1}/${friends.length}]: ${friend.title}`)

    const result = await checkFriendHealth(friend)

    if (result.isHealthy) {
      console.log(`  ✓ ${friend.title} is healthy`)
    } else {
      console.log(`  ✗ ${friend.title} has issues:`)
      result.failed.forEach((f) => {
        console.log(`    - ${f.field}: ${f.error}${f.statusCode ? ` (HTTP ${f.statusCode})` : ''}`)
      })
      unhealthyFriends.push(result)
    }

    // 延迟 1 秒，避免请求过快
    if (i < friends.length - 1) {
      await sleep(1000)
    }
  }

  console.log(`\n\n=== Summary ===`)
  console.log(`Total: ${friends.length}`)
  console.log(`Healthy: ${friends.length - unhealthyFriends.length}`)
  console.log(`Unhealthy: ${unhealthyFriends.length}`)

  // 处理不健康的友链
  if (unhealthyFriends.length > 0) {
    console.log('\n=== Processing unhealthy friends ===')

    for (const friend of unhealthyFriends) {
      console.log(`\nRemoving: ${friend.title}`)
      try {
        removeFromFriends(friend.title)
        console.log(`  ✓ Removed from friends.ts`)
      } catch (error) {
        console.error(`  ✗ Failed to remove: ${error.message}`)
      }
    }

    // 输出结果供工作流使用
    const removedTitles = unhealthyFriends.map((f) => f.title).join(', ')
    setOutput('removed', removedTitles)
    setOutput('removed_count', unhealthyFriends.length.toString())

    // 输出详细信息
    const details = unhealthyFriends
      .map((f) => {
        const issues = f.failed.map((x) => `${x.field}: ${x.error}`).join('; ')
        return `${f.title} (${issues})`
      })
      .join('\n')

    setOutput('details', details)
  } else {
    setOutput('removed', '')
    setOutput('removed_count', '0')
    setOutput('details', 'All friends are healthy')
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
