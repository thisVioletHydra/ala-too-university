import type { EditorRequest } from '#interaction/types.ts';
import type { Lesson, ScheduleCatalog, WeekDay } from '#schedule/types.ts';

import { sectionTeacher } from '#schedule/section-teacher.ts';
import { useSchedule } from '#app/schedule.store.ts';

export type EditorDraft = {
  sectionId: string
  day: WeekDay
  timeSlotId: string
  teacherId: string
  roomId: string
  lessonId?: string
  excludeLessonId?: string
  text: string | null
};

export function draftOf(
  catalog: ScheduleCatalog,
  request: EditorRequest,
  lessons: Lesson[],
): EditorDraft {
  if (request.mode === 'section') {
    const section = catalog.sections.find((item) => item.id === request.sectionId);

    return { sectionId: request.sectionId, day: 'MON', timeSlotId: '', roomId: '', teacherId: section ? sectionTeacher(section, lessons, useSchedule.getState().rememberedTeachers) ?? '' : '', text: null };
  }

  if (request.mode === 'create') {
    return {
      sectionId: request.sectionId,
      day: request.day,
      timeSlotId: request.timeSlotId,
      teacherId: request.teacherId ?? '',
      roomId: request.roomId ?? '',
      text: request.text,
    };
  }

  const lesson = lessons.find((item) => item.id === request.lessonId);
  const section = catalog.sections.find((item) => item.id === lesson?.sectionId);

  return {
    sectionId: section?.id ?? '',
    day: lesson?.day ?? 'MON',
    timeSlotId: lesson?.timeSlotId ?? '',
    teacherId: lesson?.teacherId ?? '',
    roomId: lesson?.roomId ?? '',
    lessonId: lesson?.id,
    excludeLessonId: lesson?.id,
    text: null,
  };
}
