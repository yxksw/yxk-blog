# 新文章通知记录

> 有时候，发现新内容的那一刻，正是阅读最好的时机。

## 功能概述

新文章通知功能是一个自动检测博客文章更新的客户端组件，能够在用户访问网站时，自动对比当前 RSS 数据与上次访问时的数据，发现新增或更新的文章，并以优雅的弹窗形式通知用户。

**核心特性**

- **自动检测**：基于 RSS 数据自动检测文章变更
- **差异对比**：使用 diff 算法精确识别内容变化
- **本地存储**：使用 IndexedDB 持久化存储文章数据
- **智能防误报**：过滤全量更新等特殊情况

## 实现逻辑

### 1. 数据获取与存储

**RSS 获取**：通过 `fetch('/rss.xml')` 获取当前博客文章列表

**数据解析**：解析 XML，提取标题、链接、GUID、发布时间、描述和正文内容

**IndexedDB 存储**：将文章数据存储在浏览器的 IndexedDB 中，支持离线访问

### 2. 变更检测机制

系统通过对比新旧数据检测以下变更：

| 变更类型     | 检测条件                                  | 处理方式                  |
| ------------ | ----------------------------------------- | ------------------------- |
| **新文章**   | GUID 在旧数据中不存在                     | 标记为 `isUpdated: false` |
| **标题变更** | `post.title !== stored.title`             | 使用 `diffLines` 对比差异 |
| **描述变更** | `post.description !== stored.description` | 使用 `diffLines` 对比差异 |
| **内容变更** | `post.content !== stored.content`         | 使用 `diffLines` 对比差异 |

### 3. 智能防误报策略

为避免以下情况产生误报：

1. **首次访问**：所有文章都是"新"的，不应提示
2. **全量更新**：RSS 源重建导致所有文章 GUID 变化
3. **全部更新**：所有文章同时被标记为更新

系统采用以下策略：

```typescript
// 检测是否全为新文章或全为更新
const isAllNew =
  detectedChanges.length === currentPosts.length && detectedChanges.every((p) => !p.isUpdated)
const isAllUpdated =
  detectedChanges.length === currentPosts.length && detectedChanges.every((p) => p.isUpdated)

if (isAllNew || isAllUpdated) {
  // 重置存储，不显示通知
  await clearStore(db, 'posts')
  await savePosts(db, 'posts', currentPosts)
  showNotification([], Date.now(), false, initTime)
  return
}
```

## 核心代码结构

### 组件结构

**NewPostNotification.astro**

组件采用三层架构：

1. **UI 层**：圆形铃铛图标 → 展开面板 → 文章列表
2. **动画层**：CSS 过渡动画实现平滑展开/收起
3. **逻辑层**：TypeScript 处理数据对比和状态管理

```astro
<!-- 折叠状态 -->
<div id="notification-panel" class="size-10 rounded-full ...">
  <Icon name="lucide:bell" />
</div>

<!-- 展开状态 -->
<div id="notification-content" class="flex flex-col p-5">
  <!-- 文章列表 -->
</div>
```

### 数据库操作

**notification-db.ts**

数据库操作封装：

| 函数               | 功能                  |
| ------------------ | --------------------- |
| `openDB()`         | 打开 IndexedDB 连接   |
| `getStoredPosts()` | 获取存储的文章列表    |
| `savePosts()`      | 保存文章到数据库      |
| `clearStore()`     | 清空数据存储          |
| `fetchRSS()`       | 获取并解析 RSS 数据   |
| `generateId()`     | 生成带作用域的唯一 ID |

```typescript
// 数据库配置
const DB_NAME = 'blog-rss-store-v2'
const STORE_OLD = 'posts'
const STORE_NEW = 'posts_new'
```

### 差异对比算法

使用 `diff` 库进行行级对比：

```typescript
import * as Diff from 'diff'

function computeDiff(oldText: string, newText: string) {
  // 标准化处理：统一换行符、去除行尾空格
  const normalizeRaw = (text: string) => {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/g, ''))
      .join('\n')
      .trim()
  }

  const diffs = Diff.diffLines(normalizeRaw(oldText), normalizeRaw(newText))
  return diffs.some((part) => part.added || part.removed) ? diffs : null
}
```

## 食用方法

**使用说明**：当检测到新文章或文章更新时，页面右下角会出现铃铛图标，点击即可查看变更列表。

### 功能入口

新文章通知组件 - 位于页面右下角的铃铛图标

### 交互说明

1. **首次访问**：自动记录当前文章状态，不显示通知
2. **发现更新**：铃铛图标出现红点并脉动动画，1.5秒后自动展开
3. **查看变更**：点击文章标题可跳转到对应文章
4. **标记已读**：点击"清空通知"按钮重置状态
5. **手动关闭**：点击"隐藏"按钮收起面板

## 注意事项

### 1. 数据存储限制

- **IndexedDB 容量**：浏览器通常限制在 50MB 左右
- **存储结构**：文章正文可能较大，注意监控存储空间
- **清理策略**：目前无自动清理，长期可能积累大量数据

### 2. RSS 源依赖

- **实时性**：依赖 RSS 生成时机，可能有延迟
- **完整性**：确保 RSS 包含完整文章内容（`content:encoded`）
- **跨域问题**：RSS 需与网站同域或通过代理访问

### 3. 性能优化

- **防抖处理**：对比操作在客户端执行，大量文章时可能卡顿
- **异步加载**：RSS 获取为异步，不影响页面加载
- **内存管理**：文章数据缓存在内存中，注意内存占用

### 4. 兼容性

- **浏览器支持**：需要支持 IndexedDB 的现代浏览器
- **隐私模式**：部分浏览器隐私模式下 IndexedDB 不可用
- **SSR 适配**：组件使用 `client:only` 指令，避免服务端渲染问题

## 技术栈

| 技术             | 用途           |
| ---------------- | -------------- |
| **Astro**        | 组件框架       |
| **TypeScript**   | 类型安全       |
| **IndexedDB**    | 本地数据持久化 |
| **diff**         | 文本差异对比   |
| **DOMParser**    | RSS XML 解析   |
| **Tailwind CSS** | 样式设计       |

## 总结

新文章通知功能通过 RSS 数据对比和 IndexedDB 存储，实现了客户端的文章变更检测。核心优势在于：

1. **无需后端**：纯前端实现，不依赖服务器推送
2. **精准检测**：使用 diff 算法精确识别内容变化
3. **智能防误报**：过滤首次访问和全量更新等特殊情况
4. **优雅交互**：平滑动画和清晰的信息展示

**未来优化方向**

- 支持 Web Push 推送通知
- 添加文章更新详情页（diff 可视化）
- 实现自动清理过期数据
- 支持多 RSS 源聚合
