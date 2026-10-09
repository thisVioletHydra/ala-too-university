import type { Lesson, TeacherBlockedSlot, WeekDay } from '#schedule/types.ts';

export type BusySlots = {
  teacherAt: Map<string, string>
  roomAt: Map<string, string>
  sectionAt: Map<string, string>
  blockedReason: Map<string, string>
};

export function slotKey(ownerId: string, day: WeekDay, timeSlotId: string): string {
  return `${ownerId}|${day}|${timeSlotId}`;
}

export function busySlots(
  lessons: Lesson[],
  blockedSlots: TeacherBlockedSlot[],
  excludeLessonId?: string,
): BusySlots {
  const teacherAt = new Map<string, string>();
  const roomAt = new Map<string, string>();
  const sectionAt = new Map<string, string>();
  const blockedReason = new Map<string, string>();

  for (const lesson of lessons) {
    if (lesson.id === excludeLessonId) continue;

    if (lesson.teacherId) teacherAt.set(slotKey(lesson.teacherId, lesson.day, lesson.timeSlotId), lesson.id);
    roomAt.set(slotKey(lesson.roomId, lesson.day, lesson.timeSlotId), lesson.id);
    sectionAt.set(slotKey(lesson.sectionId, lesson.day, lesson.timeSlotId), lesson.id);
  }

  for (const blocked of blockedSlots) {
    blockedReason.set(slotKey(blocked.teacherId, blocked.day, blocked.timeSlotId), blocked.reason);
  }

  return { teacherAt, roomAt, sectionAt, blockedReason };
}
