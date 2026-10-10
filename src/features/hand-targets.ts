import type { SlotAdvice } from '#schedule/conflicts.ts';
import type { Lesson, WeekDay } from '#schedule/types.ts';
import type { Zone } from '#features/hand-types.ts';

import { matchesKey } from '#accessible/keyboard.bindings.ts';
import { slotKey } from '#interaction/slot-key.ts';

export function firstOpen(
  days: WeekDay[],
  slots: string[],
  lessons: Lesson[],
  advice: Map<string, SlotAdvice>,
): { day: number, slot: number } | null {
  let fallback: { day: number, slot: number } | null = null;
  for (let slot = 0; slot < slots.length; slot++) {
    for (let day = 0; day < days.length; day++) {
      const dayId = days[day];
      const slotId = slots[slot];
      if (!dayId || !slotId) continue;

      const item = advice.get(slotKey(dayId, slotId));
      if (!item?.ok) continue;

      const occupied = lessons.some((lesson) => lesson.day === dayId && lesson.timeSlotId === slotId);
      if (occupied === false) return { day, slot };

      if (fallback === null || fallback === undefined) fallback = { day, slot };
    }
  }

  return fallback;
}

export function isHome(lessons: Lesson[], lessonId: string, dayId: WeekDay, slotId: string): boolean {
  const lesson = lessons.find((item) => item.id === lessonId);
  return lesson?.day === dayId && lesson.timeSlotId === slotId;
}

export function lessonAt(
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

export function lessonSlot(
  lesson: Lesson,
  days: WeekDay[],
  slots: string[],
): { day: number, slot: number } | null {
  const day = days.indexOf(lesson.day);
  const slot = slots.indexOf(lesson.timeSlotId);
  if (day < 0 || slot < 0) return null;

  return { day, slot };
}

export function zoneOf(target: EventTarget | null): Zone | null {
  if (!(target instanceof Element)) return null;

  if (target.closest('[data-keyboard-zone="grid"]')) return 'grid';

  if (target.closest('[data-keyboard-zone="list"]')) return 'list';

  return null;
}

export function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (target.closest('[role="dialog"]')) return true;

  const tag = target.tagName;

  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function isArrow(key: string): boolean {
  return matchesKey('navigation', key);
}
