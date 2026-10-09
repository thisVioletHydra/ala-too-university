import { useSchedule } from '#app/schedule.store.ts';

export function unassignLesson(lessonId: string): void {
  useSchedule.getState().unassignLesson(lessonId);
}
