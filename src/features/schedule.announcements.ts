import type { Lesson } from '#schedule/types.ts';

import { announce } from '#accessible/reader.announcements.ts';
import { useSchedule } from '#app/schedule.store.ts';
import { useEffect } from 'react';

export function scheduleChangeMessage(previous: Lesson[], next: Lesson[]): string {
  if (next.length > previous.length) return 'Занятие добавлено в расписание';

  if (next.length < previous.length) return 'Занятие удалено из расписания';

  const before = new Map(previous.map((lesson) => [lesson.id, lesson]));
  const moved = next.some((lesson) => {
    const original = before.get(lesson.id);
    return original && (original.day !== lesson.day || original.timeSlotId !== lesson.timeSlotId);
  });

  return moved ? 'Занятие перемещено' : 'Расписание обновлено';
}

/** Объявляем изменения данных, но не каждое перемещение клавиатурного курсора. */
export function useScheduleAnnouncements(): void {
  useEffect(() => useSchedule.subscribe((next, previous) => {
    if (next.catalog !== previous.catalog || next.dataset !== previous.dataset) return;

    if (next.lessons !== previous.lessons) announce(scheduleChangeMessage(previous.lessons, next.lessons));
  }), []);
}
