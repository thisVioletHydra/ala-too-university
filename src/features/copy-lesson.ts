import type { ConflictResult, LessonMove } from '#schedule/types.ts';

import { useSchedule } from '#app/schedule.store.ts';

export function copyLesson(input: LessonMove): ConflictResult {
  return useSchedule.getState().copyLesson(input);
}
