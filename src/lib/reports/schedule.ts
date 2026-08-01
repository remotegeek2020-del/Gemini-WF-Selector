export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly'

export interface ReportSchedule {
  id: string
  account_id: string
  label: string | null
  pipeline: string
  hot_only: boolean
  frequency: ScheduleFrequency
  hour_utc: number
  day_of_week: number | null
  day_of_month: number | null
  date_range_days: number | null
  recipients: string[]
  is_active: boolean
  last_sent_at: string | null
  next_run_at: string
  created_at: string
}

export function computeNextRunAt(
  frequency: ScheduleFrequency,
  hourUtc: number,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  from: Date = new Date()
): Date {
  const next = new Date(from)
  next.setUTCMinutes(0, 0, 0)
  next.setUTCHours(hourUtc)

  if (frequency === 'daily') {
    if (next <= from) next.setUTCDate(next.getUTCDate() + 1)
  } else if (frequency === 'weekly') {
    const target = dayOfWeek ?? 1
    const cur = next.getUTCDay()
    let diff = (target - cur + 7) % 7
    if (diff === 0 && next <= from) diff = 7
    next.setUTCDate(next.getUTCDate() + diff)
  } else if (frequency === 'monthly') {
    const target = dayOfMonth ?? 1
    next.setUTCDate(target)
    if (next <= from) {
      next.setUTCMonth(next.getUTCMonth() + 1)
      next.setUTCDate(target)
    }
  }

  return next
}

export function frequencyLabel(schedule: ReportSchedule): string {
  const hour = schedule.hour_utc
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h = hour % 12 || 12
  const timeStr = `${h}:00 ${ampm} UTC`

  if (schedule.frequency === 'daily') return `Daily at ${timeStr}`
  if (schedule.frequency === 'weekly') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return `Weekly on ${days[schedule.day_of_week ?? 1]} at ${timeStr}`
  }
  const dom = schedule.day_of_month ?? 1
  const suffix = dom === 1 ? 'st' : dom === 2 ? 'nd' : dom === 3 ? 'rd' : 'th'
  return `Monthly on the ${dom}${suffix} at ${timeStr}`
}

export function dateRangeLabel(dateRangeDays: number | null): string {
  if (!dateRangeDays) return 'All time'
  if (dateRangeDays === 1) return 'Last 24 hours'
  if (dateRangeDays === 7) return 'Last 7 days'
  if (dateRangeDays === 14) return 'Last 14 days'
  if (dateRangeDays === 30) return 'Last 30 days'
  if (dateRangeDays === 90) return 'Last 90 days'
  return `Last ${dateRangeDays} days`
}
