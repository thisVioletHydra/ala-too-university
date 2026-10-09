import { ScheduleApp } from '@/components/schedule/schedule-app'
import mockData from '@/lib/schedule/mock-data.json'
import type { ScheduleData } from '@/lib/schedule/types'

export default function Page() {
  return <ScheduleApp data={mockData as ScheduleData} />
}
