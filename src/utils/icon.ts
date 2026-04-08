/**
 * 链接图标匹配工具
 * 根据域名自动匹配对应的图标
 */

// 专门域名匹配（优先级高）
const specificDomainIcons: Record<string, string> = {
  'docs.microsoft.com': 'logos:microsoft-icon',
  'learn.microsoft.com': 'logos:microsoft-icon',
  'github.com': 'ri:github-fill',
  'www.bilibili.com': 'ri:bilibili-line',
  'bilibili.com': 'ri:bilibili-line',
  'space.bilibili.com': 'ri:bilibili-line',
  'qq.com': 'ri:qq-fill',
  'mp.weixin.qq.com': 'ri:wechat-fill',
  'weixin.qq.com': 'ri:wechat-fill',
  'zhihu.com': 'ri:zhihu-line',
  'www.zhihu.com': 'ri:zhihu-line',
  'juejin.cn': 'simple-icons:juejin',
  'csdn.net': 'simple-icons:csdn',
  'www.csdn.net': 'simple-icons:csdn',
  'blog.csdn.net': 'simple-icons:csdn',
  'stackoverflow.com': 'logos:stackoverflow-icon',
  'npmjs.com': 'logos:npm-icon',
  'www.npmjs.com': 'logos:npm-icon',
  'youtube.com': 'ri:youtube-fill',
  'www.youtube.com': 'ri:youtube-fill',
  'twitter.com': 'ri:twitter-x-fill',
  'x.com': 'ri:twitter-x-fill',
  'google.com': 'logos:google-icon',
  'www.google.com': 'logos:google-icon',
}

// 主域名匹配
const domainIcons: Record<string, string> = {
  microsoft: 'logos:microsoft-icon',
  github: 'ri:github-fill',
  bilibili: 'ri:bilibili-line',
  qq: 'ri:qq-fill',
  weixin: 'ri:wechat-fill',
  zhihu: 'ri:zhihu-line',
  juejin: 'simple-icons:juejin',
  csdn: 'simple-icons:csdn',
  stackoverflow: 'logos:stackoverflow-icon',
  npmjs: 'logos:npm-icon',
  youtube: 'ri:youtube-fill',
  twitter: 'ri:twitter-x-fill',
  google: 'logos:google-icon',
  baidu: 'simple-icons:baidu',
  aliyun: 'simple-icons:alicloud',
  tencent: 'simple-icons:tencentqq',
  gitee: 'simple-icons:gitee',
  gitlab: 'ri:gitlab-fill',
  vercel: 'logos:vercel-icon',
  netlify: 'logos:netlify-icon',
}

/**
 * 根据 URL 获取对应的图标
 * @param url 链接地址
 * @returns Iconify 图标名或 undefined
 */
export function getIconByUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    // 1. 优先匹配专门域名
    if (specificDomainIcons[hostname]) {
      return specificDomainIcons[hostname]
    }

    // 2. 匹配主域名
    const parts = hostname.split('.')
    for (const part of parts) {
      if (domainIcons[part]) {
        return domainIcons[part]
      }
    }

    return undefined
  } catch {
    return undefined
  }
}

/**
 * 判断是否为外部链接
 * @param url 链接地址
 * @returns 是否为外部链接
 */
export function isExternalLink(url: string): boolean {
  try {
    const urlObj = new URL(url)
    // 获取当前站点域名（在浏览器环境中）
    if (typeof window !== 'undefined') {
      return urlObj.hostname !== window.location.hostname
    }
    return true
  } catch {
    // 相对路径视为内部链接
    return false
  }
}

/**
 * 获取域名显示文本
 * @param url 链接地址
 * @returns 域名文本
 */
export function getDomainText(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
