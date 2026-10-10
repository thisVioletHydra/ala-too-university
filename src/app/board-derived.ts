import type { SlotAdvice } from '#schedule/conflicts.ts';
import type { ScheduleCatalog, WeekDay } from '#schedule/types.ts';
import type { ActiveDrag, DragFace, Hand } from '#interaction/types.ts';

import { sectionTeacher } from '#schedule/section.teacher.ts';
import { explainSlot } from '#schedule/conflicts.ts';
import { slotKey } from '#interaction/slot.key.ts';

export function handToDrag(hand: Hand | null, copy: boolean): ActiveDrag | null {
  if (hand === null || hand === undefined) return null;

  if (hand.kind === 'section') return { ...hand };

  return { kind: 'lesson', lessonId: hand.lessonId, copy };
}

export function adviceMap(
  catalog: ScheduleCatalog,
  lessons: ScheduleCatalog['lessons'],
  remembered: Record<string, string>,
  active: ActiveDrag | null,
  repeat: boolean,
): Map<string, SlotAdvice> {
  const map = new Map<string, SlotAdvice>();
  if (!active) return map;

  const lesson = active.kind === 'lesson'
    ? lessons.find((item) => item.id === active.lessonId)
    : null;
  const sectionId = active.kind === 'section' ? active.sectionId : lesson?.sectionId;
  const section = catalog.sections.find((item) => item.id === sectionId);
  if (section === null || section === undefined) return map;

  const teacherId = lesson
    ? lesson.teacherId
    : active.kind === 'section' ? sectionTeacher(section, lessons, remembered) : null;
  const roomId = repeat ? null : lesson ? lesson.roomId : active.kind === 'section' ? active.roomId ?? null : null;
  const excludeLessonId = active.kind === 'lesson' && !active.copy && !repeat ? active.lessonId : undefined;

  for (const day of catalog.weekDays) {
    for (const timeSlot of catalog.timeSlots) {
      if (repeat && lessons.some((item) => item.sectionId === section.id && item.day === day.id && item.timeSlotId === timeSlot.id)) {
        map.set(slotKey(day.id, timeSlot.id), { ok: true, text: 'Убрать', teacherId, roomId, needsChoice: false });
        continue;
      }

      map.set(slotKey(day.id, timeSlot.id), explainSlot({
        section,
        day: day.id,
        timeSlotId: timeSlot.id,
        lessons,
        rooms: catalog.rooms,
        sections: catalog.sections,
        blockedSlots: catalog.blockedSlots,
        teacherId,
        roomId,
        excludeLessonId,
      }));
    }
  }

  return map;
}

export function dragFace(
  catalog: ScheduleCatalog,
  lessons: ScheduleCatalog['lessons'],
  remembered: Record<string, string>,
  active: ActiveDrag | null,
): DragFace | null {
  if (!active) return null;

  if (active.kind === 'section') {
    const section = catalog.sections.find((item) => item.id === active.sectionId);
    if (section === null || section === undefined) return null;

    const teacherId = sectionTeacher(section, lessons, remembered);

    return {
      code: section.code,
      courseId: section.courseId,
      courseCode: courseCode(catalog, section.courseId),
      teacherName: teacherId ? catalog.teachers.find((item) => item.id === teacherId)?.shortName ?? null : null,
      roomName: null,
    };
  }

  const lesson = lessons.find((item) => item.id === active.lessonId);
  const section = catalog.sections.find((item) => item.id === lesson?.sectionId);
  if (!lesson || !section) return null;

  return {
    code: section.code,
    courseId: section.courseId,
    courseCode: courseCode(catalog, section.courseId),
    teacherName: catalog.teachers.find((item) => item.id === lesson.teacherId)?.shortName ?? null,
    roomName: catalog.rooms.find((item) => item.id === lesson.roomId)?.name ?? null,
  };
}

export function courseCode(catalog: ScheduleCatalog, courseId: string): string {
  return catalog.courses.find((course) => course.id === courseId)?.code ?? '';
}

export function altKey(event: Event | null): boolean {
  if (event instanceof MouseEvent) return event.altKey;

  return false;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isDay(value: unknown): value is WeekDay {
  return value === 'MON' || value === 'TUE' || value === 'WED' || value === 'THU' || value === 'FRI';
}
