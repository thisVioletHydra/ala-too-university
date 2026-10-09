import type { ConflictResult, LessonMove } from '#schedule/types.ts';

import { useSchedule } from '#app/schedule.store.ts';

export function moveLesson(input: LessonMove): ConflictResult {
  return useSchedule.getState().moveLesson(input);
}
