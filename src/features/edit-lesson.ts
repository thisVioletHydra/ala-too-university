import type { ConflictResult, LessonEdit, Placement } from '#schedule/types.ts';

import { useSchedule } from '#app/schedule.store.ts';

export function editLesson(input: LessonEdit): ConflictResult {
  return useSchedule.getState().editLesson(input);
}

export function placeFromEditor(input: Placement): ConflictResult {
  const result = useSchedule.getState().placeLesson(input);
  if (!result.ok) return result;

  if (input.teacherId) useSchedule.getState().rememberTeacher(input.sectionId, input.teacherId);

  return result;
}
