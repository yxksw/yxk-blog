#!/usr/bin/env tsx
/**
 * AI 摘要生成脚本
 * 用于为博客文章自动生成 AI 摘要并写入 frontmatter
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import { glob } from 'glob'
import readline from 'readline'
import { createReadStream } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 配置
const CONFIG = {
  postsDir: path.join(__dirname, '../src/content/posts'),
  apiUrl: process.env.AI_SUMMARY_API || 'https://ai.zsxcoder.top/api/spark-proxy',
  apiKey: process.env.AI_SUMMARY_KEY || '',
  model: process.env.AI_SUMMARY_MODEL || 'lite',
  concurrency: parseInt(process.env.AISUMMARY_CONCURRENCY || '2'),
  coverAll: process.env.AISUMMARY_COVER_ALL === 'true',
  maxToken: parseInt(process.env.AISUMMARY_MAX_TOKEN || '5000'),
  minContentLength: parseInt(process.env.AISUMMARY_MIN_CONTENT_LENGTH || '50'),
}

// 日志级别
const LOG_LEVEL = {
  ERROR: 0,
  INFO: 1,
  DEBUG: 2,
}

const currentLogLevel = LOG_LEVEL.DEBUG

function log(level: keyof typeof LOG_LEVEL, message: string) {
  if (LOG_LEVEL[level] <= currentLogLevel) {
    const prefix = level === 'ERROR' ? '❌' : level === 'INFO' ? 'ℹ️' : '🐛'
    console.log(`${prefix} ${message}`)
  }
}

/**
 * 清理 Markdown 内容，去除代码块、HTML 标签等
 */
function cleanMarkdown(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, '') // 代码块
    .replace(/`[^`]*`/g, '') // 行内代码
    .replace(/<[^>]*>/g, '') // HTML 标签
    .replace(/!\[.*?\]\(.*?\)/g, '') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接
    .replace(/[#*_~`]/g, '') // Markdown 标记
    .replace(/\n+/g, '\n') // 多余换行
    .trim()
}

/**
 * 截断内容到指定长度
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength) + '...'
}

/**
 * 调用 AI API 生成摘要
 */
async function generateSummary(content: string, title: string): Promise<string> {
  const cleanedContent = cleanMarkdown(content)
  const truncatedContent = truncateContent(cleanedContent, CONFIG.maxToken)

  const prompt = `请为以下文章生成一段简短的摘要（100-200字左右），要求：
1. 准确概括文章主要内容
2. 语言简洁流畅
3. 不要包含"本文"、"作者"等字样
4. 直接输出摘要内容，不要添加任何前缀或说明

文章标题：${title}

文章内容：
${truncatedContent}`

  try {
    const response = await fetch(CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CONFIG.apiKey && { Authorization: `Bearer ${CONFIG.apiKey}` }),
      },
      body: JSON.stringify({
        content: prompt,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      log('ERROR', `API 错误响应: ${errorText}`)
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    log('DEBUG', `API 响应: ${JSON.stringify(data)}`)

    // 适配不同的响应格式
    const summary =
      data.choices?.[0]?.message?.content ||
      data.result ||
      data.summary ||
      data.text ||
      data.content ||
      data.data ||
      data.message

    if (!summary) {
      throw new Error(`API 返回数据格式异常: ${JSON.stringify(data)}`)
    }

    return summary.trim()
  } catch (error) {
    log('ERROR', `生成摘要失败: ${error}`)
    throw error
  }
}

/**
 * 读取配置文件中的注释配置
 */
async function readConfigFromFile(): Promise<Partial<typeof CONFIG>> {
  const configPath = path.join(__dirname, '../src/plugins/aisummary.config.js')
  try {
    const content = await fs.readFile(configPath, 'utf-8')
    const config: Partial<typeof CONFIG> = {}

    // 解析注释中的配置
    const apiMatch = content.match(/AI_SUMMARY_API=(.+)/)
    if (apiMatch) config.apiUrl = apiMatch[1].trim()

    const keyMatch = content.match(/AI_SUMMARY_KEY=(.+)/)
    if (keyMatch) config.apiKey = keyMatch[1].trim()

    const concurrencyMatch = content.match(/AISUMMARY_CONCURRENCY=(\d+)/)
    if (concurrencyMatch) config.concurrency = parseInt(concurrencyMatch[1])

    const coverAllMatch = content.match(/AISUMMARY_COVER_ALL=(true|false)/)
    if (coverAllMatch) config.coverAll = coverAllMatch[1] === 'true'

    const maxTokenMatch = content.match(/AISUMMARY_MAX_TOKEN=(\d+)/)
    if (maxTokenMatch) config.maxToken = parseInt(maxTokenMatch[1])

    const minLengthMatch = content.match(/AISUMMARY_MIN_CONTENT_LENGTH=(\d+)/)
    if (minLengthMatch) config.minContentLength = parseInt(minLengthMatch[1])

    return config
  } catch {
    return {}
  }
}

/**
 * 询问用户是否覆盖
 */
async function askOverwrite(title: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`文章 "${title}" 已有摘要，是否覆盖? (y/N): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

/**
 * 处理单篇文章
 */
async function processPost(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const parsed = matter(content)

    // 检查是否已有摘要
    if (parsed.data.summary && !CONFIG.coverAll) {
      log('INFO', `跳过已有摘要的文章: ${parsed.data.title || path.basename(filePath)}`)
      return false
    }

    // 检查内容长度
    const cleanedContent = cleanMarkdown(parsed.content)
    if (cleanedContent.length < CONFIG.minContentLength) {
      log('INFO', `内容太短，跳过: ${parsed.data.title || path.basename(filePath)}`)
      return false
    }

    log('INFO', `正在生成摘要: ${parsed.data.title || path.basename(filePath)}`)

    // 生成摘要
    const summary = await generateSummary(parsed.content, parsed.data.title || '')

    // 更新 frontmatter
    parsed.data.summary = summary

    // 写回文件
    const newContent = matter.stringify(parsed.content, parsed.data)
    await fs.writeFile(filePath, newContent, 'utf-8')

    log('INFO', `✅ 摘要已生成: ${parsed.data.title || path.basename(filePath)}`)
    return true
  } catch (error) {
    log('ERROR', `处理文章失败 ${filePath}: ${error}`)
    return false
  }
}

/**
 * 并发控制处理
 */
async function processWithConcurrency<T>(
  items: T[],
  processor: (item: T) => Promise<boolean>,
  concurrency: number,
): Promise<number> {
  let completed = 0
  let successCount = 0

  async function processBatch(batch: T[]) {
    const results = await Promise.all(batch.map(processor))
    results.forEach((success) => {
      if (success) successCount++
    })
    completed += batch.length
    log('INFO', `进度: ${completed}/${items.length}`)
  }

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    await processBatch(batch)
  }

  return successCount
}

/**
 * 主函数
 */
async function main() {
  log('INFO', '🚀 AI 摘要生成脚本启动')
  log('INFO', `📁 文章目录: ${CONFIG.postsDir}`)
  log('INFO', `🔗 API 地址: ${CONFIG.apiUrl}`)
  log('INFO', `⚡ 并发数: ${CONFIG.concurrency}`)
  log('INFO', `📝 最大 Token: ${CONFIG.maxToken}`)

  // 读取配置文件
  const fileConfig = await readConfigFromFile()
  Object.assign(CONFIG, fileConfig)

  // 查找所有文章
  const files = await glob('**/*.{md,mdx}', {
    cwd: CONFIG.postsDir,
    absolute: true,
  })

  if (files.length === 0) {
    log('INFO', '未找到任何文章文件')
    return
  }

  log('INFO', `📄 找到 ${files.length} 篇文章`)

  // 处理文章
  const successCount = await processWithConcurrency(files, processPost, CONFIG.concurrency)

  log('INFO', `\n✨ 完成! 成功生成 ${successCount}/${files.length} 篇文章的摘要`)
}

main().catch((error) => {
  log('ERROR', `脚本执行失败: ${error}`)
  process.exit(1)
})
