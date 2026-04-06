export interface TimetableConfigSegment {
  courseLen: number
  id: number
  name: string
  sameBreakLen: boolean
  sameLen: boolean
  theBreakLen: number
  timeTable: number
}

export interface TimetableNodeTime {
  node: number
  startTime: string
  endTime: string
  timeTable: number
}

export interface TimetableSettings {
  background: string
  courseTextColor: number
  id: number
  itemAlpha: number
  itemHeight: number
  itemTextSize: number
  maxWeek: number
  nodes: number
  school: string
  showOtherWeekCourse: boolean
  showSat: boolean
  showSun: boolean
  showTime: boolean
  startDate: string
  strokeColor: number
  sundayFirst: boolean
  tableName: string
  textColor: number
  tid: string
  timeTable: number
  type: number
  updateTime: number
  widgetCourseTextColor: number
  widgetItemAlpha: number
  widgetItemHeight: number
  widgetItemTextSize: number
  widgetStrokeColor: number
  widgetTextColor: number
}

export interface TimetableCourseDefinition {
  color: string
  courseName: string
  credit: number
  id: number
  note: string
  tableId: number
}

export interface TimetableSchedule {
  day: number
  endTime: string
  endWeek: number
  id: number
  level: number
  ownTime: boolean
  room: string
  startNode: number
  startTime: string
  startWeek: number
  step: number
  tableId: number
  teacher: string
  type: number
}

export interface ParsedTimetableData {
  courseLen: number
  id: number
  name: string
  sameBreakLen: boolean
  sameLen: boolean
  theBreakLen: number
  timeTable: TimetableNodeTime[]
  settings: TimetableSettings
  courses: TimetableCourseDefinition[]
  schedules: TimetableSchedule[]
}

export interface TimetableCourseView {
  courseId: number
  courseName: string
  color: string
  teacher: string
  room: string
  day: number
  startNode: number
  endNode: number
  durationNodes: number
  startWeek: number
  endWeek: number
  nodeText: string
  timeText: string
}

export interface TimetableDayColumn {
  day: number
  label: string
}

export interface TimetableNodeRow {
  node: number
  startTime: string
  endTime: string
}

export interface TimetableViewModel {
  tableName: string
  maxWeek: number
  currentWeek: number
  weeks: number[]
  dayColumns: TimetableDayColumn[]
  nodeRows: TimetableNodeRow[]
  coursesByDay: Record<number, TimetableCourseView[]>
}
