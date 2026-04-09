import { input } from '@inquirer/prompts'
import fs from 'fs'
import path from 'path'
import { isFileNameSafe } from './utils.js'

function getPostFullPath(fileName) {
  return path.join('./src/content/posts', `${fileName}.mdx`)
}

const fileName = await input({
  message: '请输入文件名称',
  validate: (value) => {
    if (!isFileNameSafe(value)) {
      return '文件名只能包含字母、数字和连字符'
    }
    const fullPath = getPostFullPath(value)
    if (fs.existsSync(fullPath)) {
      return `${fullPath} 已存在`
    }
    return true
  },
})

const title = await input({
  message: '请输入文章标题',
})

const description = await input({
  message: '请输入文章描述（可选）',
})

const categories = await input({
  message: '请输入分类（多个分类用逗号分隔，可选）',
})

const tags = await input({
  message: '请输入标签（多个标签用逗号分隔，可选）',
})

const column = await input({
  message: '请输入专栏（默认：博客）',
  default: '博客',
})

const now = new Date()
const dateStr = now.toISOString()

// 格式化分类
const categoriesList = categories
  ? categories
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => `  - ${c}`)
      .join('\n')
  : '  - '

// 格式化标签
const tagsList = tags
  ? tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => `  - ${t}`)
      .join('\n')
  : '  - '

const content = `---
title: ${title}
description: ${description}
date: ${dateStr}
updated:
categories:
${categoriesList}
tags:
${tagsList}
slug: ${fileName}
aiSummary: true
comments: true
draft: false
column: ${column}
outdate: false
cover: 
status: true
pinned: false
---

`

const fullPath = getPostFullPath(fileName)
fs.writeFileSync(fullPath, content)
console.log(`${fullPath} 创建成功`)
