import type {
  ParsedTimetableData,
  TimetableCourseView,
  TimetableDayColumn,
  TimetableNodeRow,
  TimetableViewModel,
} from '@/types/timetable'

const WEEKDAY_LABELS: Record<number, string> = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
}

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
  const saturation = 78
  const lightness = 68
  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

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

  if (week < 1) {
    return 1
  }
  if (week > maxWeek) {
    return 1
  }
  return week
}

function toNodeRows(data: ParsedTimetableData): TimetableNodeRow[] {
  const rows = data.timeTable
    .filter((item) => item.node >= 1 && item.node <= data.settings.nodes)
    .sort((a, b) => a.node - b.node)
    .map((item) => ({
      node: item.node,
      startTime: item.startTime,
      endTime: item.endTime,
    }))

  if (rows.length > 0) {
    return rows
  }

  return Array.from({ length: data.settings.nodes }, (_, index) => {
    const node = index + 1
    return {
      node,
      startTime: '--:--',
      endTime: '--:--',
    }
  })
}

function toDayColumns(data: ParsedTimetableData): TimetableDayColumn[] {
  const columns: TimetableDayColumn[] = [
    { day: 1, label: WEEKDAY_LABELS[1] },
    { day: 2, label: WEEKDAY_LABELS[2] },
    { day: 3, label: WEEKDAY_LABELS[3] },
    { day: 4, label: WEEKDAY_LABELS[4] },
    { day: 5, label: WEEKDAY_LABELS[5] },
  ]

  if (data.settings.showSat) {
    columns.push({ day: 6, label: WEEKDAY_LABELS[6] })
  }
  if (data.settings.showSun) {
    columns.push({ day: 7, label: WEEKDAY_LABELS[7] })
  }
  return columns
}

function toCourseView(
  schedule: ParsedTimetableData['schedules'][0],
  courseName: string,
  color: string,
  nodeRows: TimetableNodeRow[],
): TimetableCourseView {
  const fixedDurationNodes = 2
  const maxNode = Math.max(...nodeRows.map((row) => row.node), schedule.startNode)
  const endNode = Math.min(schedule.startNode + fixedDurationNodes - 1, maxNode)
  const startNodeRow = nodeRows.find((row) => row.node === schedule.startNode)
  const endNodeRow = nodeRows.find((row) => row.node === endNode)
  const startTime = startNodeRow?.startTime ?? '--:--'
  const endTime = endNodeRow?.endTime ?? '--:--'

  return {
    courseId: schedule.id,
    courseName,
    color,
    teacher: schedule.teacher?.trim() || '未填写',
    room: schedule.room?.trim() || '未填写',
    day: schedule.day,
    startNode: schedule.startNode,
    endNode,
    durationNodes: fixedDurationNodes,
    startWeek: schedule.startWeek,
    endWeek: schedule.endWeek,
    nodeText: `第 ${schedule.startNode}-${endNode} 节`,
    timeText: `${startTime} - ${endTime}`,
  }
}

export function buildTimetableViewModel(
  data: ParsedTimetableData,
  selectedWeek: number,
): TimetableViewModel {
  const maxWeek = Math.max(1, data.settings.maxWeek || 1)
  const week = Math.min(Math.max(1, selectedWeek), maxWeek)
  const nodeRows = toNodeRows(data)
  const dayColumns = toDayColumns(data)

  const courseMap = new Map(data.courses.map((course) => [course.id, course]))

  const coursesByDay: Record<number, TimetableCourseView[]> = {}
  for (const column of dayColumns) {
    coursesByDay[column.day] = []
  }

  for (const schedule of data.schedules) {
    if (schedule.day < 1 || schedule.day > 7) {
      continue
    }
    if (week < schedule.startWeek || week > schedule.endWeek) {
      continue
    }
    if (!(schedule.day in coursesByDay)) {
      continue
    }

    const courseDef = courseMap.get(schedule.id)
    const courseName = courseDef?.courseName ?? `课程 #${schedule.id}`
    const color = courseDef?.color || buildCourseColor(courseName, schedule.id)
    coursesByDay[schedule.day].push(toCourseView(schedule, courseName, color, nodeRows))
  }

  for (const day of Object.keys(coursesByDay)) {
    coursesByDay[Number(day)].sort(
      (a, b) => a.startNode - b.startNode || a.courseName.localeCompare(b.courseName),
    )
  }

  return {
    tableName: data.settings.tableName || '课表',
    maxWeek,
    currentWeek: week,
    weeks: Array.from({ length: maxWeek }, (_, index) => index + 1),
    dayColumns,
    nodeRows,
    coursesByDay,
  }
}
