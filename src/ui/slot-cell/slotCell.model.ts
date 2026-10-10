import type { Lesson, WeekDay } from '#schedule/types.ts';
import type { ActiveDrag, Hand } from '#interaction/types.ts';

export function isHomeCell(
  ghost: ActiveDrag | null,
  hand: Hand | null,
  lessons: Lesson[],
  day: WeekDay,
  timeSlotId: string,
): boolean {
  let carried: string | null = null;
  if (hand?.kind === 'lesson') carried = hand.lessonId;

  if (hand?.kind === 'section') carried = hand.originLessonId ?? null;

  if (ghost?.kind === 'lesson' && !ghost.copy) carried = ghost.lessonId;

  if (carried === null || carried === undefined) return false;

  const lesson = lessons.find((item) => item.id === carried);

  return lesson?.day === day && lesson.timeSlotId === timeSlotId;
}
