import type { SlotAdvice } from '#schedule/conflicts.ts';
import type { Lesson, WeekDay } from '#schedule/types.ts';

import { slotKey } from '#interaction/slot.key.ts';

export function firstAvailableSlot(
  days: WeekDay[],
  slots: string[],
  lessons: Lesson[],
  advice: Map<string, SlotAdvice>,
): { day: number, slot: number } | null {
  const occupiedSlots = new Set(lessons.map((lesson) => slotKey(lesson.day, lesson.timeSlotId)));
  let fallback: { day: number, slot: number } | null = null;
  for (let slot = 0; slot < slots.length; slot++) {
    for (let day = 0; day < days.length; day++) {
      const dayId = days[day];
      const slotId = slots[slot];
      if (!dayId || !slotId) continue;

      const item = advice.get(slotKey(dayId, slotId));
      if (!item?.ok) continue;

      const occupied = occupiedSlots.has(slotKey(dayId, slotId));
      if (occupied === false) return { day, slot };

      if (fallback === null) fallback = { day, slot };
    }
  }

  return fallback;
}

export function isOriginalSlot(lessons: Lesson[], lessonId: string, dayId: WeekDay, slotId: string): boolean {
  const lesson = lessons.find((item) => item.id === lessonId);
  return lesson?.day === dayId && lesson.timeSlotId === slotId;
}

export function lessonAtTarget(
  lessons: Lesson[],
  days: WeekDay[],
  slots: string[],
  day: number,
  slot: number,
  target: EventTarget | null,
): Lesson | null {
  if (target instanceof Element) {
    const id = target.closest('[data-lesson-id]')?.getAttribute('data-lesson-id');
    if (id) return lessons.find((item) => item.id === id) ?? null;
  }

  const dayId = days[day];
  const slotId = slots[slot];
  if (!dayId || !slotId) return null;

  return lessons.find((item) => item.day === dayId && item.timeSlotId === slotId) ?? null;
}

export function lessonPosition(
  lesson: Lesson,
  days: WeekDay[],
  slots: string[],
): { day: number, slot: number } | null {
  const day = days.indexOf(lesson.day);
  const slot = slots.indexOf(lesson.timeSlotId);
  if (day < 0 || slot < 0) return null;

  return { day, slot };
}

