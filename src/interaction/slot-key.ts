import type { WeekDay } from '#schedule/types.ts';

export function slotKey(day: WeekDay, timeSlotId: string): string {
  return `${day}|${timeSlotId}`;
}
