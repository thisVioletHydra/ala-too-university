import type { EditorRequest } from '#interaction/types.ts';
import type { Lesson, ScheduleCatalog, TimeSlot, WeekDay } from '#schedule/types.ts';

import { sectionTeacher } from '#schedule/section-teacher.ts';
import { pickRoom } from '#schedule/pick-room.ts';
import { useSchedule } from '#app/schedule.store.ts';

const DAY_LABELS: Record<WeekDay, string> = {
  MON: 'Понедельник',
  TUE: 'Вторник',
  WED: 'Среда',
  THU: 'Четверг',
  FRI: 'Пятница',
};

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

/** Аудитория по умолчанию: свободная и подходящая по вместимости. */
export function initialRoomId(catalog: ScheduleCatalog, draft: EditorDraft, lessons: Lesson[]): string {
  if (draft.roomId !== '') return draft.roomId;

  const section = catalog.sections.find((item) => item.id === draft.sectionId);
  if (section === undefined) return '';

  const room = pickRoom({
    section,
    day: draft.day,
    timeSlotId: draft.timeSlotId,
    rooms: catalog.rooms,
    lessons,
    excludeLessonId: draft.excludeLessonId,
  });

  return room?.id ?? '';
}

export function whenLabel(day: WeekDay, timeSlot: TimeSlot | undefined): string {
  if (timeSlot === undefined) return DAY_LABELS[day];

  return `${DAY_LABELS[day]} · ${timeSlot.start}–${timeSlot.end}`;
}

/** Сколько занятий сверх нормы получится после сохранения. */
export function excessCount(input: { assigned: number; total: number; required: number }): number {
  return Math.max(0, input.total - input.required);
}
