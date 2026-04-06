import type {
  ParsedTimetableData,
  TimetableNodeTime,
  TimetableCourseDefinition,
  TimetableSchedule,
} from '@/types/timetable'

export function parseTimetableFile(jsonText: string): ParsedTimetableData {
  const data = JSON.parse(jsonText)

  return {
    courseLen: data.courseLen,
    id: data.id,
    name: data.name,
    sameBreakLen: data.sameBreakLen,
    sameLen: data.sameLen,
    theBreakLen: data.theBreakLen,
    timeTable: data.timeTable as TimetableNodeTime[],
    settings: data.settings,
    courses: data.courses as TimetableCourseDefinition[],
    schedules: data.schedules as TimetableSchedule[],
  }
}
