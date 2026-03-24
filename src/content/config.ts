import { z, defineCollection } from 'astro:content'

const DEFAULT_TIMEZONE_OFFSET = '+08:00'

function parseFrontmatterDate(input: string): Date | undefined {
  const s = input.trim()
  if (!s) return undefined

  // 字符串里已带时区信息时，直接按原值解析。
  if (/[zZ]$|[+\-]\d{2}:\d{2}$/.test(s)) {
    const withT = s.includes('T') ? s : s.replace(' ', 'T')
    const d = new Date(withT)
    return isNaN(d.valueOf()) ? undefined : d
  }

  // 只有日期时，默认按配置时区的当天 00:00:00 解析。
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00${DEFAULT_TIMEZONE_OFFSET}`)
    return isNaN(d.valueOf()) ? undefined : d
  }

  // 无时区的日期时间统一附加默认时区，避免跨天漂移。
  const normalized = s.includes('T') ? s : s.replace(' ', 'T')
  const d = new Date(`${normalized}${DEFAULT_TIMEZONE_OFFSET}`)
  return isNaN(d.valueOf()) ? undefined : d
}

const toDate = z
  .union([z.date(), z.string()])
  .optional()
  .transform((val) => {
    if (!val) return undefined
    if (val instanceof Date) return val
    return parseFrontmatterDate(val as string)
  })

const postsCollection = defineCollection({
  type: 'content',
  schema: z
    .object({
      // 标准字段
      title: z.string(),
      date: toDate,
      lastMod: toDate,
      summary: z.string().optional(),
      cover: z.string().nullable().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).default([]),
      comments: z.boolean().default(true),
      draft: z.boolean().default(false),
      sticky: z.number().default(0),

      // 专栏/目录序号（例如：1、1.1、1.1.1），兼容 YAML 把 1.1 解析为 number 的情况
      index: z
        .union([z.string(), z.number()])
        .optional()
        .transform((v) => {
          if (v === undefined || v === null) return undefined
          return String(v)
        }),

      description: z.string().optional(),
      categories: z.array(z.string()).optional(),
      updated: toDate,
      status: z.boolean().optional(),
      unlisted: z.boolean().optional(),
      pinned: z.boolean().optional(),
      aiSummary: z.boolean().optional(),
      outdate: z.boolean().optional(), // 控制是否显示过期提示，默认根据时间自动判断
      slug: z.union([z.string(), z.number()]).optional(),
    })
    .transform((data) => {
      // summary <- description
      const summary = data.summary ?? data.description
      // category <- categories[0]
      const category = data.category ?? (data.categories && data.categories[0])
      // lastMod <- updated
      const lastMod = data.lastMod ?? data.updated
      // draft <- !status
      const draft = typeof data.status === 'boolean' ? !data.status : data.draft
      // unlisted: default false
      const unlisted = data.unlisted ?? false
      // sticky <- pinned ? 1 : sticky
      const sticky = typeof data.pinned === 'boolean' ? (data.pinned ? 1 : 0) : data.sticky
      // date required after transform
      const date = data.date ?? data.updated ?? data.lastMod

      return {
        ...data,
        summary,
        category,
        lastMod,
        draft,
        unlisted,
        sticky,
        date: date as Date | undefined,
      }
    })
    .refine((v) => v.date instanceof Date, {
      message: 'posts: invalid or missing "date"',
      path: ['date'],
    }),
})

const projectsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string(),
    link: z.string().url(),
  }),
})

const columnsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    items: z.array(
      z.object({
        slug: z.string(),
        title: z.string().optional(),
      }),
    ),
  }),
})

const specCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    comments: z.boolean().default(true),
  }),
})

const friendsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    avatar: z.string(),
    link: z.string().url(),
  }),
})

export const collections = {
  posts: postsCollection,
  projects: projectsCollection,
  columns: columnsCollection,
  spec: specCollection,
  friends: friendsCollection,
}
