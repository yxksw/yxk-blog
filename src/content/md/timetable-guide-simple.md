# Astro 博客课程表页面实现教程

## 前言

本文详细讲解如何使用 Astro + TypeScript 构建一个功能完整的课程表页面，包括数据结构设计、数据解析、组件架构等核心知识点。

## 整体架构

课程表页面采用分层设计：

1. **数据层** - JSON 文件存储课程数据
2. **解析层** - TypeScript 工具函数解析 JSON 并计算当前周次
3. **类型层** - 定义完整的数据类型系统
4. **组件层** - Astro 组件负责渲染页面结构
5. **交互层** - 客户端脚本实现实时状态更新

## 数据结构设计

### JSON 数据格式

课程数据存储在一个 JSON 文件中，包含以下字段：

```json
{
  "config": {
    "courseLen": 2,
    "id": 1,
    "name": "默认配置"
  },
  "nodeTimes": [{ "node": 1, "startTime": "08:00", "endTime": "09:40", "timeTable": 1 }],
  "meta": {
    "id": 1,
    "tableName": "大三下",
    "maxWeek": 20,
    "nodes": 10,
    "startDate": "2026-3-2",
    "timeTable": 1,
    "showSat": false,
    "showSun": false
  },
  "courseDefinitions": [{ "id": 1, "courseName": "计算机网络", "color": "#FF6B6B" }],
  "arrangements": [
    {
      "id": 1,
      "day": 1,
      "startNode": 1,
      "step": 2,
      "startWeek": 1,
      "endWeek": 16,
      "teacher": "张老师",
      "room": "A101"
    }
  ]
}
```

### TypeScript 类型定义

```typescript
// 配置段
interface TimetableConfigSegment {
  courseLen: number
  id: number
  name: string
}

// 节次时间
interface TimetableNodeTime {
  node: number
  startTime: string
  endTime: string
  timeTable: number
}

// 元数据
interface TimetableMetaSegment {
  id: number
  tableName: string
  maxWeek: number
  nodes: number
  startDate: string
  timeTable: number
  showSat?: boolean
  showSun?: boolean
}

// 课程定义
interface TimetableCourseDefinition {
  id: number
  courseName: string
  color?: string
}

// 课程安排
interface TimetableCourseArrangement {
  id: number
  day: number
  startNode: number
  step: number
  startWeek: number
  endWeek: number
  teacher?: string
  room?: string
}

// 解析后的完整数据
interface ParsedTimetableData {
  config: TimetableConfigSegment
  nodeTimes: TimetableNodeTime[]
  meta: TimetableMetaSegment
  courseDefinitions: TimetableCourseDefinition[]
  arrangements: TimetableCourseArrangement[]
}
```

## 数据解析层

### JSON 解析器

```typescript
const EXPECTED_SEGMENT_COUNT = 5

function parseJsonLine<T>(line: string, lineNumber: number): T {
  const normalizedLine = line.endsWith(',') ? line.slice(0, -1) : line
  try {
    return JSON.parse(normalizedLine) as T
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`课表数据解析失败：第 ${lineNumber} 行不是合法 JSON（${message}）`)
  }
}

export function parseTimetableText(rawText: string): ParsedTimetableData {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length !== EXPECTED_SEGMENT_COUNT) {
    throw new Error(`课表数据结构错误：必须恰好包含 ${EXPECTED_SEGMENT_COUNT} 段 JSON`)
  }

  const segments = lines.map((line, index) => parseJsonLine<unknown>(line, index + 1))
  const [config, nodeTimes, meta, courseDefinitions, arrangements] = segments

  return {
    config: config as TimetableConfigSegment,
    nodeTimes: nodeTimes as TimetableNodeTime[],
    meta: meta as TimetableMetaSegment,
    courseDefinitions: courseDefinitions as TimetableCourseDefinition[],
    arrangements: arrangements as TimetableCourseArrangement[],
  }
}
```

### 当前周计算

```typescript
function parseDateFromYmd(ymd: string): Date | null {
  const parts = ymd.split('-').map((part) => Number(part))
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return null
  }
  const [year, month, day] = parts
  return new Date(year, month - 1, day)
}

export function resolveCurrentWeek(
  startDateText: string,
  maxWeek: number,
  now: Date = new Date(),
): number {
  const startDate = parseDateFromYmd(startDateText)
  if (!startDate) {
    return 1
  }

  const msPerDay = 24 * 60 * 60 * 1000
  const diffDays = Math.floor((now.getTime() - startDate.getTime()) / msPerDay)
  const week = Math.floor(diffDays / 7) + 1

  if (week < 1) return 1
  if (week > maxWeek) return 1
  return week
}
```

## 页面路由设计

### 首页路由

```astro
---
import fs from 'node:fs'
import path from 'node:path'
import type { TimetableViewModel } from '@/types/timetable'
import TimetablePageContent from '@components/timetable/TimetablePageContent.astro'
import MainGridLayout from '@layouts/MainGridLayout.astro'
import { buildTimetableViewModel, resolveCurrentWeek } from '@utils/timetable-normalizer'
import { parseTimetableFile } from '@utils/timetable-parser-server'

const filePath = 'src/data/timetable/大三下.json'
const absoluteFilePath = path.join(process.cwd(), filePath)

let viewModel: TimetableViewModel | null = null
let loadError = ''
let isCurrentWeek = false
let baselineText = ''

try {
  baselineText = fs.readFileSync(absoluteFilePath, 'utf-8')
  const parsedData = parseTimetableFile(filePath)
  const currentWeek = resolveCurrentWeek(parsedData.meta.startDate, parsedData.meta.maxWeek)
  viewModel = buildTimetableViewModel(parsedData, currentWeek)
  isCurrentWeek = viewModel.currentWeek === currentWeek
} catch (error) {
  loadError = error instanceof Error ? error.message : '课表数据加载失败'
}
---

<MainGridLayout title={viewModel ? `课表 - 第${viewModel.currentWeek}周` : '课表'}>
  {
    viewModel ? (
      <TimetablePageContent
        viewModel={viewModel}
        isCurrentWeek={isCurrentWeek}
        baselineText={baselineText}
      />
    ) : (
      <div class="card-base p-6 md:p-8">
        <div class="text-red-500">课表加载失败：{loadError}</div>
      </div>
    )
  }
</MainGridLayout>
```

### 动态路由

```astro
---
const weekParam = Number(Astro.params.week)

// 使用 URL 参数中的周次，如果无效则使用当前周
const selectedWeek =
  Number.isFinite(weekParam) && weekParam >= 1 ? Math.floor(weekParam) : currentWeek

// 生成所有周次的静态路径
export function getStaticPaths() {
  const parsedData = parseTimetableFile('src/data/timetable/大三下.json')
  const maxWeek = Math.max(1, parsedData.meta.maxWeek || 1)
  return Array.from({ length: maxWeek }, (_, index) => ({
    params: { week: String(index + 1) },
  }))
}
---
```

## 组件层实现

### 页面容器组件

```astro
---
import type { TimetableViewModel } from '@/types/timetable'
import LiveTimetableStatus from '@components/timetable/LiveTimetableStatus.astro'
import TimetableDayList from '@components/timetable/TimetableDayList.astro'
import TimetableGrid from '@components/timetable/TimetableGrid.astro'

interface Props {
  viewModel: TimetableViewModel
  isCurrentWeek?: boolean
  baselineText: string
}

const { viewModel, isCurrentWeek = false, baselineText } = Astro.props

const liveStatusPayload = {
  coursesByDay: viewModel.coursesByDay,
}
---

<div class="card-base p-6 md:p-8">
  <!-- 页面头部 -->
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold">{viewModel.tableName}</h1>
    <span class="text-sm text-white/60">共 {viewModel.maxWeek} 周</span>
  </div>

  <!-- 周次导航 -->
  <div class="flex items-center gap-3 mb-5">
    <a href={`/timetable/${Math.max(1, viewModel.currentWeek - 1)}/`}> 上一周 </a>
    <span class="min-w-[4.5rem] text-center font-medium">
      第 {viewModel.currentWeek} 周
    </span>
    <a href={`/timetable/${Math.min(viewModel.maxWeek, viewModel.currentWeek + 1)}/`}> 下一周 </a>
    {
      isCurrentWeek && (
        <span class="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-sm font-medium text-emerald-200">
          当前周
        </span>
      )
    }
  </div>

  <!-- 实时状态 -->
  <LiveTimetableStatus payload={liveStatusPayload} class="mb-4" />

  <!-- 桌面端网格 -->
  <TimetableGrid viewModel={viewModel} />

  <!-- 移动端列表 -->
  <TimetableDayList viewModel={viewModel} />
</div>
```

### 桌面端网格组件

```astro
---
import type { TimetableCourseView } from '@/types/timetable'
import TimetableCourseCard from '@components/timetable/TimetableCourseCard.astro'

interface Props {
  viewModel: TimetableViewModel
}

const { viewModel } = Astro.props

const dayIndexes = viewModel.dayColumns.map((day) => day.day)
const dayCount = viewModel.dayColumns.length

// 构建课程查找表
const courseMapByDayAndNode = new Map<string, TimetableCourseView[]>()

for (const day of dayIndexes) {
  for (const course of viewModel.coursesByDay[day] ?? []) {
    const pairStartNode = course.startNode % 2 === 1 ? course.startNode : course.startNode - 1
    const key = `${day}-${Math.max(1, pairStartNode)}`
    const list = courseMapByDayAndNode.get(key) ?? []
    list.push(course)
    courseMapByDayAndNode.set(key, list)
  }
}
---

<div class="hidden md:block card-base w-full overflow-hidden" style={`--day-count: ${dayCount}`}>
  <!-- 表头 -->
  <div class="timetable-header-grid border-b border-white/10">
    <div class="px-3 py-2 text-xs border-r border-white/10">节次</div>
    {
      viewModel.dayColumns.map((day) => (
        <div class="px-3 py-2 text-sm font-semibold border-r last:border-r-0 border-white/10">
          {day.label}
        </div>
      ))
    }
  </div>

  <!-- 课程行 -->
  {
    viewModel.nodeRows
      .filter((row) => row.node % 2 === 1)
      .map((row) => (
        <div class="timetable-row-grid border-b last:border-b-0 border-white/10">
          <div class="px-3 py-3 border-r border-white/10">
            <p class="text-xs font-medium">
              第 {row.node}-{Math.min(row.node + 1, viewModel.nodeRows.length)} 节
            </p>
            <p class="text-[11px] text-white/80 mt-1">{row.startTime}</p>
          </div>

          {viewModel.dayColumns.map((day) => {
            const key = `${day.day}-${row.node}`
            const courses = courseMapByDayAndNode.get(key) ?? []
            return (
              <div class="px-2 py-2 border-r last:border-r-0 border-white/10 align-top min-h-[88px]">
                {courses.length > 0 ? (
                  <div class="space-y-2">
                    {courses.map((course) => (
                      <TimetableCourseCard course={course} compact={true} />
                    ))}
                  </div>
                ) : (
                  <div class="h-full flex items-center justify-center text-[11px] text-white/60">
                    —
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))
  }
</div>

<style>
  .timetable-header-grid,
  .timetable-row-grid {
    display: grid;
    grid-template-columns: 120px repeat(var(--day-count), minmax(180px, 1fr));
  }
</style>
```

### 实时状态组件

```astro
---
import type { TimetableCourseView } from '@/types/timetable'

interface Props {
  payload: {
    coursesByDay: Record<number, TimetableCourseView[]>
  }
}

const { payload } = Astro.props
const payloadText = encodeURIComponent(JSON.stringify(payload))
---

<div data-live-status-root data-live-payload={payloadText}>
  <p data-live-status class="text-sm font-semibold">状态计算中...</p>
  <p class="mt-1 text-sm">
    <span>下一堂课：</span>
    <span data-live-next-detail class="font-medium">--</span>
    <span data-live-next-tail></span>
  </p>
</div>

<script is:inline>
  function parseTimeToMinute(text) {
    const parts = String(text || '').split(':')
    if (parts.length !== 2) return null
    return Number(parts[0]) * 60 + Number(parts[1])
  }

  function resolveLiveState(payload) {
    const now = new Date()
    const currentMinute = now.getHours() * 60 + now.getMinutes()
    const day = now.getDay() === 0 ? 7 : now.getDay()

    if (day >= 6) {
      return { status: '周末', nextDetail: '--', nextTail: '' }
    }

    const courses = (payload?.coursesByDay?.[day] || [])
      .map((course) => {
        const match = course.timeText.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)
        if (!match) return null
        return {
          ...course,
          startMinute: parseTimeToMinute(match[1]),
          endMinute: parseTimeToMinute(match[2]),
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.startMinute - b.startMinute)

    if (courses.length === 0) {
      return { status: '无课', nextDetail: '--', nextTail: '' }
    }

    let status = '无课'
    for (let i = 0; i < courses.length; i++) {
      const current = courses[i]
      if (currentMinute >= current.startMinute && currentMinute < current.endMinute) {
        status = `上课（${current.courseName}）`
        break
      }
      const next = courses[i + 1]
      if (next && currentMinute >= current.endMinute && currentMinute < next.startMinute) {
        status = `课间（下一节：${next.courseName}）`
        break
      }
    }

    const nextCourse = courses.find((c) => c.startMinute > currentMinute)
    if (!nextCourse) {
      return { status, nextDetail: '--', nextTail: '' }
    }

    const remainMinutes = nextCourse.startMinute - currentMinute
    const hours = Math.floor(remainMinutes / 60)
    const minutes = remainMinutes % 60
    const timeText = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`

    return {
      status,
      nextDetail: `${nextCourse.courseName} - ${nextCourse.room || '未填写'}`,
      nextTail: `（${timeText}后）`,
      nextColor: nextCourse.color,
    }
  }

  function updateLiveStatus(root) {
    const payloadRaw = decodeURIComponent(root.dataset.livePayload || '%7B%7D')
    const payload = JSON.parse(payloadRaw)
    const state = resolveLiveState(payload)

    root.querySelector('[data-live-status]').textContent = state.status
    root.querySelector('[data-live-next-detail]').textContent = state.nextDetail
    root.querySelector('[data-live-next-tail]').textContent = state.nextTail
    root.querySelector('[data-live-next-detail]').style.color = state.nextColor || ''
  }

  function setupLiveStatus() {
    document.querySelectorAll('[data-live-status-root]').forEach(updateLiveStatus)
    setInterval(() => {
      document.querySelectorAll('[data-live-status-root]').forEach(updateLiveStatus)
    }, 30 * 1000)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupLiveStatus)
  } else {
    setupLiveStatus()
  }
</script>
```

## 样式与交互

### 响应式设计

课表页面使用了响应式设计，桌面端显示网格，移动端显示列表：

```astro
<!-- 桌面端网格 -->
<TimetableGrid viewModel={viewModel} />

<!-- 移动端列表 -->
<TimetableDayList viewModel={viewModel} />
```

在组件内部使用 Tailwind 的响应式类控制显示：

```astro
<!-- TimetableGrid.astro -->
<div class="hidden md:block">...</div>

<!-- TimetableDayList.astro -->
<div class="md:hidden">...</div>
```

### 颜色生成

每个课程卡片都有一个唯一的颜色，通过哈希函数生成：

```typescript
function hashText(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function buildCourseColor(courseName: string, courseId: number): string {
  const seed = hashText(`${courseName}-${courseId}`)
  const hue = seed % 360
  return `hsl(${hue} 78% 68%)`
}
```

使用 HSL 颜色模式，固定饱和度和亮度，只改变色相，这样生成的颜色既多样又和谐。

## 可视化编辑器（进阶）

TimetableVisualEditor.svelte 是一个功能完整的可视化编辑器，让用户可以直接在浏览器里增删改课程。

### 核心功能

1. **双栏布局** - 左侧课程列表，右侧属性编辑面板
2. **编辑模式** - 提供"编辑课表"和"退出编辑"按钮
3. **数据验证** - 实时验证课程数据的合法性
4. **导出功能** - 将编辑后的数据导出为 JSON 文件

### 状态管理

```typescript
let editMode = false // 是否处于编辑模式
let draftParsed: ParsedTimetableData // 编辑中的数据副本
let selectedArrangementRef: number | null // 当前选中的课程索引
let validationError = '' // 验证错误信息
let isDirty = false // 数据是否有修改
let creatingCourse = false // 是否正在创建新课程
```

### 表单验证

```typescript
function validateDraft(data: ParsedTimetableData): string {
  for (let index = 0; index < data.arrangements.length; index += 1) {
    const arrangement = data.arrangements[index]

    if (arrangement.day < 1 || arrangement.day > 7) {
      return `第 ${index + 1} 条课程安排的星期超出范围（1-7）`
    }

    if (arrangement.startNode < 1 || arrangement.startNode > maxNode) {
      return `第 ${index + 1} 条课程安排的起始节次超出范围`
    }

    if (arrangement.startWeek > arrangement.endWeek) {
      return `第 ${index + 1} 条课程安排的起止周非法`
    }

    const courseDef = data.courseDefinitions.find((c) => c.id === arrangement.id)
    if (!courseDef || !courseDef.courseName?.trim()) {
      return `第 ${index + 1} 条课程安排关联课程名为空`
    }
  }
  return ''
}
```

### 数据导出

```typescript
function exportJson() {
  const error = validateDraft(draftParsed)
  if (error) {
    validationError = error
    return
  }

  const text = serializeTimetableDataToFileText(draftParsed)
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${baselineParsed.meta.tableName || 'timetable'}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
```

## 总结

通过这篇文章，我们详细解析了一个完整的课程表页面的实现过程：

**数据层** - 设计了清晰的 JSON 数据结构，分离配置、定义和安排

**类型层** - 使用 TypeScript 定义完整类型，确保类型安全

**解析层** - 实现 JSON 解析、数据转换和当前周计算

**路由层** - 使用 Astro 动态路由生成所有周次页面

**组件层** - 拆分多个组件，实现网格布局、列表布局、课程卡片

**交互层** - 客户端脚本实现实时状态更新

**编辑层** - 可视化编辑器支持增删改课程

### 可扩展的功能

如果你想进一步完善这个课表页面，可以考虑：

1. **多课表支持** - 支持切换不同学期的课表
2. **课程提醒** - 上课前发送浏览器通知
3. **导出功能** - 导出为 ICS 日历文件
4. **数据同步** - 从教务系统自动同步课程

希望这篇教程对你有帮助！
