// 简单的字符串哈希函数，用于生成照片URL的唯一标识
export function generateHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // 转换为32位整数
  }
  // 转换为正数的十六进制字符串
  return Math.abs(hash).toString(16).substring(0, 8)
}
