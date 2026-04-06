/** Links configuration for Links page */
export interface LinkItem {
  name: string
  description: string
  url: string
  avatar: string
  /** 普通友链需要日期用于计算印记，specialLinks 可以不填 */
  addDate?: string
  recommended?: boolean
  disconnected?: boolean
}

/** 印记配置 - 根据添加天数显示不同印记 */
export interface BadgeConfig {
  name: string
  minDays: number
  maxDays: number
  color: string
  icon: string
}

export const badgeConfigs: BadgeConfig[] = [
  { name: '失联/Lost', minDays: 0, maxDays: 0, color: '#9ca3af', icon: 'ghost' },
  { name: '初遇/First', minDays: 0, maxDays: 30, color: '#94a3b8', icon: 'star' },
  { name: '萌芽/Sprout', minDays: 30, maxDays: 60, color: '#22c55e', icon: 'sprout' },
  { name: '抽叶/Leaf', minDays: 60, maxDays: 90, color: '#22c55e', icon: 'leaf' },
  { name: '绽放/Bloom', minDays: 90, maxDays: 180, color: '#22c55e', icon: 'bloom' },
  { name: '轻语/Whisper', minDays: 180, maxDays: 270, color: '#22c55e', icon: 'feather' },
  { name: '听风/Wind', minDays: 270, maxDays: 365, color: '#60a5fa', icon: 'wind' },
  { name: '云游/Cloud', minDays: 365, maxDays: 450, color: '#60a5fa', icon: 'cloud' },
  { name: '润泽/Water', minDays: 450, maxDays: 540, color: '#60a5fa', icon: 'water' },
  { name: '凝冰/Ice', minDays: 540, maxDays: 630, color: '#60a5fa', icon: 'snowflake' },
  { name: '磐石/Rock', minDays: 630, maxDays: 730, color: '#94a3b8', icon: 'mountain' },
  { name: '坚守/Guard', minDays: 730, maxDays: 900, color: '#f97316', icon: 'shield' },
  { name: '燃情/Fire', minDays: 900, maxDays: 1080, color: '#f97316', icon: 'flame' },
  { name: '烈阳/Sun', minDays: 1080, maxDays: 1460, color: '#ef4444', icon: 'sun' },
  { name: '雷鸣/Zap', minDays: 1460, maxDays: 2190, color: '#a855f7', icon: 'lightning' },
  { name: '传世/Legend', minDays: 2190, maxDays: Infinity, color: '#a855f7', icon: 'crown' },
]

/** Special Links 的特殊印记配置 */
export const specialLinkBadge: BadgeConfig & { days: number } = {
  name: '特别/Special',
  minDays: 0,
  maxDays: Infinity,
  color: '#f97316',
  icon: 'crown',
  days: 0,
}

/** 计算链接的印记 */
export function getLinkBadge(link: LinkItem | string): BadgeConfig & { days: number } {
  // 兼容旧的 string 类型参数
  if (typeof link === 'string') {
    link = { addDate: link } as LinkItem
  }

  // 如果是失联状态，直接返回失联印记
  if (link.disconnected) {
    const disconnectedBadge = badgeConfigs.find((b) => b.name.includes('失联'))!
    return { ...disconnectedBadge, days: 0 }
  }

  // 没有日期时，退回默认印记，天数记为 0
  if (!link.addDate) {
    const badge = badgeConfigs[1]
    return { ...badge, days: 0 }
  }

  const addDateObj = new Date(link.addDate)
  const now = new Date()
  const diffTime = now.getTime() - addDateObj.getTime()
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // 找到对应的印记配置
  const badge =
    badgeConfigs.find((config) => {
      if (config.name.includes('失联')) return false // 跳过失联印记的常规匹配
      if (config.maxDays === Infinity) {
        return days >= config.minDays
      }
      return days >= config.minDays && days < config.maxDays
    }) || badgeConfigs[1] // 默认返回初遇 (索引1)

  return { ...badge, days }
}

// 远程友链数据 - 从 https://github.com/yxksw/Friends/blob/main/data/friends.ts
export const links: LinkItem[] = [
  {
    name: '测试友链检测',
    description: '测试友链检测',
    url: 'https://cs.050815.xyz',
    avatar: 'https://cn.cravatar.com/avatar/eb7277a11fa4dc00606e73afda41aeeb?=256',
    addDate: '2026-02-21',
    disconnected: true,
  },
  {
    name: 'ATao-Blog',
    description: '做自己喜欢的事',
    url: 'https://blog.atao.cyou/',
    avatar: 'https://cdn.atao.cyou/Web/Avatar.png',
    addDate: '2026-02-21',
    recommended: true,
  },
  {
    name: '梨尽兴',
    description: 'A place for peace',
    url: 'https://blog.ljx.icu',
    avatar: 'https://blog.ljx.icu/favicon.png',
    addDate: '2026-02-20',
    recommended: true,
  },
  {
    name: '纸鹿摸鱼处',
    description: '纸鹿至麓不知路，支炉制露不止漉',
    url: 'https://blog.zhilu.site/',
    avatar: 'https://www.zhilu.site/api/avatar.png',
    addDate: '2025-09-03',
    recommended: true,
  },
  {
    name: '鈴奈咲桜のBlog',
    description: '愛することを忘れないで',
    url: 'https://blog.sakura.ink',
    avatar: 'https://q2.qlogo.cn/headimg_dl?dst_uin=2731443459&spec=5',
    addDate: '2025-09-09',
    recommended: true,
  },
]

// Special Links（不算友链的其他特别链接）
export const specialLinks: LinkItem[] = [
  {
    name: 'Astro',
    description: 'The web framework for content-driven websites',
    url: 'https://astro.build/',
    avatar: 'https://avatars.githubusercontent.com/u/44914786?s=200&v=4',
  },
  {
    name: 'Astro Theme Pure',
    description: 'Stay hungry, stay foolish',
    url: 'https://astro-pure.js.org/',
    avatar: 'https://astro-pure.js.org/favicon/favicon.ico',
  },
]
