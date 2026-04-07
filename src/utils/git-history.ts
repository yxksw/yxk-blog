import config from '@/config.json'

export interface Commit {
  hash: string
  date: string
  message: string
}

export function getPostHistory(postId: string): Commit[] {
  try {
    // 这里需要从预生成的 JSON 文件中获取
    // 由于 JSON 文件可能很大，我们使用动态导入
    const historyMap = (window as any).__GIT_HISTORY__ as Record<string, Commit[]>
    if (historyMap?.[postId]) {
      return historyMap[postId]
    }
    return []
  } catch (e) {
    console.error(`Failed to get git history for post: ${postId}`, e)
    return []
  }
}

export function getCommitUrl(hash: string): string {
  const gitHubEdit = config.gitHubEdit
  if (!gitHubEdit.enable || !gitHubEdit.baseUrl) {
    return '#'
  }

  // 从编辑 URL 提取仓库根 URL
  // 编辑 URL 示例: https://github.com/user/repo/blob/main/src/content/posts
  // 提交 URL: https://github.com/user/repo/commit/HASH
  const blobIndex = gitHubEdit.baseUrl.indexOf('/blob/')
  if (blobIndex !== -1) {
    const repoRoot = gitHubEdit.baseUrl.substring(0, blobIndex)
    return `${repoRoot}/commit/${hash}`
  }

  return `${gitHubEdit.baseUrl}/../../commit/${hash}`
}
