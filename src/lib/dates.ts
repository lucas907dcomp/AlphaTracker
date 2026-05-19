import { startOfDay, startOfWeek, startOfMonth, parseISO, isAfter, isEqual } from 'date-fns'

export function getStartOfDay(d: Date): Date {
  return startOfDay(d)
}

export function getStartOfWeek(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 })
}

export function getStartOfMonth(d: Date): Date {
  return startOfMonth(d)
}

export function isInPeriod(operacaoDate: string, period: 'day' | 'week' | 'month'): boolean {
  const date = parseISO(operacaoDate)
  const now = new Date()
  const starts: Record<typeof period, Date> = {
    day: getStartOfDay(now),
    week: getStartOfWeek(now),
    month: getStartOfMonth(now),
  }
  const start = starts[period]
  return isAfter(date, start) || isEqual(date, start)
}
