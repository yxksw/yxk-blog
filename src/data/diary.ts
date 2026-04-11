// 日记数据配置
// 用于管理日记页面的数据

export interface DiaryItem {
  id: number
  content: string
  date: string
  images?: string[]
  location?: string
  mood?: string
  tags?: string[]
}

// 示例日记数据
const diaryData: DiaryItem[] = [
  {
    id: 3,
    content: '今天参考原Gridea的思路，找到了主题的位置，然后开始魔改。感觉还行。',
    date: '2025-04-11T23:49:00Z',
    tags: ['生活', '博客'],
    location: '南京',
  },
  {
    id: 2,
    content: '今天完成了博客95%的修改，并拓展了Gridea-pro。',
    date: '2025-04-11T00:18:00Z',
    tags: ['生活', '博客'],
    mood: '😊',
  },
  {
    id: 1,
    content: '今天完成了博客90%的修改，继续加油！',
    date: '2025-04-09T23:00:00Z',
    tags: ['生活', '博客'],
    mood: '😊',
  },
]

// 获取日记列表（按时间倒序）
export const getDiaryList = (limit?: number) => {
  const sortedData = [...diaryData].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  if (limit && limit > 0) {
    return sortedData.slice(0, limit)
  }

  return sortedData
}

// 获取所有标签
export const getAllTags = () => {
  const tags = new Set<string>()
  diaryData.forEach((item) => {
    if (item.tags) {
      item.tags.forEach((tag) => tags.add(tag))
    }
  })
  return Array.from(tags).sort()
}
