// 获取两个日期的相对时间
export function getRelativeTime(startDate: Date, endDate = new Date()) {
  const diffSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000)
  if (diffSeconds < 0) {
    return null
  }

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 10) {
    return '刚刚'
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} 小时前`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 10) {
    return `${diffDays} 天前`
  }

  return null
}

// 获取一个格式化的日期，格式：26年3月24日 星期二
export function getFormattedDate(date: Date) {
  const year = date.getFullYear() % 100
  const month = date.getMonth() + 1
  const day = date.getDate()
  const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()]

  return `${year}年${month}月${day}日 ${week}`
}

// 数字前补 0
function padZero(number: number, len = 2) {
  return number.toString().padStart(len, '0')
}

// 获取格式化后的日期时间，格式：2026 年 03 月 24 日 23:51
export function getFormattedDateTime(date: Date) {
  const year = date.getFullYear()
  const month = padZero(date.getMonth() + 1)
  const day = padZero(date.getDate())
  const hours = padZero(date.getHours())
  const minutes = padZero(date.getMinutes())

  return `${year} 年 ${month} 月 ${day} 日 ${hours}:${minutes}`
}

// 获取两个日期相差的天数
export function getDiffInDays(startDate: Date, endDate = new Date()) {
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 86400))
}

// 获取短日期，格式：03-24
export function getShortDate(date: Date) {
  const month = padZero(date.getMonth() + 1)
  const day = padZero(date.getDate())

  return `${month}-${day}`
}

// 获取日期所在年份的总天数
export function getDaysInYear(date: Date) {
  const year = date.getFullYear()
  if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
    return 366
  }
  return 365
}

// 获取日期所在年份的第一天
export function getStartOfYear(date: Date) {
  const year = date.getFullYear()
  return new Date(year, 0, 1)
}

// 获取日期所在当天的 00:00:00
export function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// 判断是否属于"显著更新"
export function isSignificantDateUpdate(date: Date, lastMod?: Date, thresholdHours = 12) {
  if (!lastMod) return false
  const thresholdMs = thresholdHours * 60 * 60 * 1000
  return lastMod.getTime() - date.getTime() >= thresholdMs
}

// 计算两个日期之间的时间差
export interface TimeDifference {
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function calculateTimeDifference(startDate: Date, endDate: Date): TimeDifference {
  let years = endDate.getFullYear() - startDate.getFullYear()
  let months = endDate.getMonth() - startDate.getMonth()
  let days = endDate.getDate() - startDate.getDate()
  let hours = endDate.getHours() - startDate.getHours()
  let minutes = endDate.getMinutes() - startDate.getMinutes()
  let seconds = endDate.getSeconds() - startDate.getSeconds()

  // 处理负数情况
  if (seconds < 0) {
    seconds += 60
    minutes--
  }
  if (minutes < 0) {
    minutes += 60
    hours--
  }
  if (hours < 0) {
    hours += 24
    days--
  }
  if (days < 0) {
    const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0)
    days += prevMonth.getDate()
    months--
  }
  if (months < 0) {
    months += 12
    years--
  }

  return { years, months, days, hours, minutes, seconds }
}

// 格式化时间差为中文描述
export function formatTimeDifference(diff: TimeDifference): string {
  const parts: string[] = []

  if (diff.years > 0) {
    parts.push(`${diff.years}年`)
  }
  if (diff.months > 0) {
    parts.push(`${diff.months}个月`)
  }
  if (diff.days > 0 && parts.length < 2) {
    parts.push(`${diff.days}天`)
  }
  if (diff.hours > 0 && parts.length < 2) {
    parts.push(`${diff.hours}小时`)
  }
  if (diff.minutes > 0 && parts.length < 2) {
    parts.push(`${diff.minutes}分钟`)
  }

  if (parts.length === 0) {
    return '刚刚'
  }

  return parts.join('')
}

// 获取时间单位
export interface TimeUnits {
  year: number
  month: number
  day: number
  hours: number
  minutes: number
  seconds: number
}

export function getTimeUnits(date: Date): TimeUnits {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hours: date.getHours(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
  }
}
