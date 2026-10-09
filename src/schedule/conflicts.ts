import type {
  ConflictResult,
  Lesson,
  Placement,
  Room,
  ScheduleCatalog,
  Section,
  TeacherBlockedSlot,
  WeekDay,
} from '#schedule/types.ts';

import { busySlots, slotKey } from '#schedule/busy-slots.ts';
import { pickRoom } from '#schedule/pick-room.ts';

export type ConflictInput = {
  placement: Placement
  lessons: Lesson[]
  sections: Section[]
  rooms: Room[]
  blockedSlots: TeacherBlockedSlot[]
  excludeLessonId?: string
};

export type SlotAdvice = {
  ok: boolean
  text: string | null
  teacherId: string | null
  roomId: string | null
  needsChoice: boolean
};

export type ExplainInput = {
  section: Section
  day: WeekDay
  timeSlotId: string
  lessons: Lesson[]
  rooms: Room[]
  sections: Section[]
  blockedSlots: TeacherBlockedSlot[]
  teacherId: string | null
  roomId: string | null
  excludeLessonId?: string
};

export function placementConflict(input: ConflictInput): ConflictResult {
  const { placement, lessons, sections, rooms, blockedSlots, excludeLessonId } = input;
  const section = sections.find((item) => item.id === placement.sectionId);
  if (section === null || section === undefined) {
    return { ok: false, kind: 'section-busy', text: 'Секция не найдена' };
  }

  const room = rooms.find((item) => item.id === placement.roomId);
  if (room === null || room === undefined) {
    return { ok: false, kind: 'no-room', text: 'Аудитория не найдена' };
  }

  const busy = busySlots(lessons, blockedSlots, excludeLessonId);
  const sectionHit = busy.sectionAt.get(slotKey(placement.sectionId, placement.day, placement.timeSlotId));
  if (sectionHit) {
    return { ok: false, kind: 'section-busy', text: 'У секции уже есть занятие в этом слоте' };
  }

  const blocked = busy.blockedReason.get(slotKey(placement.teacherId, placement.day, placement.timeSlotId));
  if (placement.teacherId && blocked) {
    return { ok: false, kind: 'teacher-blocked', text: blocked };
  }

  const teacherHit = busy.teacherAt.get(slotKey(placement.teacherId, placement.day, placement.timeSlotId));
  if (placement.teacherId && teacherHit) {
    return { ok: false, kind: 'teacher-busy', text: 'Преподаватель занят' };
  }

  if (room.capacity < section.studentsCount) {
    return {
      ok: false,
      kind: 'room-small',
      text: `В ${room.name} ${room.capacity} мест, студентов ${section.studentsCount}`,
    };
  }

  const roomHit = busy.roomAt.get(slotKey(placement.roomId, placement.day, placement.timeSlotId));
  if (roomHit) {
    return { ok: false, kind: 'room-busy', text: 'Аудитория занята' };
  }

  if (placement.teacherId && !section.allowedTeacherIds.includes(placement.teacherId)) {
    return {
      ok: false,
      kind: 'teacher-not-allowed',
      text: 'Этот преподаватель не ведёт секцию',
    };
  }

  return { ok: true };
}

export function explainSlot(input: ExplainInput): SlotAdvice {
  const busy = busySlots(input.lessons, input.blockedSlots, input.excludeLessonId);
  const sectionHit = busy.sectionAt.get(slotKey(input.section.id, input.day, input.timeSlotId));
  if (sectionHit) {
    return {
      ok: false,
      text: 'У секции уже есть занятие в этом слоте',
      teacherId: input.teacherId,
      roomId: input.roomId,
      needsChoice: false,
    };
  }

  if (input.teacherId && input.roomId) {
    const result = placementConflict({
      placement: {
        sectionId: input.section.id,
        teacherId: input.teacherId,
        roomId: input.roomId,
        day: input.day,
        timeSlotId: input.timeSlotId,
      },
      lessons: input.lessons,
      sections: input.sections,
      rooms: input.rooms,
      blockedSlots: input.blockedSlots,
      excludeLessonId: input.excludeLessonId,
    });
    if (!result.ok) {
      return {
        ok: false,
        text: result.text,
        teacherId: input.teacherId,
        roomId: input.roomId,
        needsChoice: result.kind === 'room-busy' || result.kind === 'room-small' || result.kind === 'no-room',
      };
    }

    return {
      ok: true,
      text: null,
      teacherId: input.teacherId,
      roomId: input.roomId,
      needsChoice: false,
    };
  }

  if (input.teacherId) {
    const teacherStop = teacherStopText(busy, input.teacherId, input.day, input.timeSlotId);
    if (teacherStop) {
      return {
        ok: false,
        text: teacherStop,
        teacherId: input.teacherId,
        roomId: null,
        needsChoice: false,
      };
    }

    const room = pickRoom({
      section: input.section,
      day: input.day,
      timeSlotId: input.timeSlotId,
      rooms: input.rooms,
      lessons: input.lessons,
      excludeLessonId: input.excludeLessonId,
    });
    if (room === null || room === undefined) {
      return {
        ok: false,
        text: noRoomText(input.section, input.rooms),
        teacherId: input.teacherId,
        roomId: null,
        needsChoice: true,
      };
    }

    return {
      ok: true,
      text: null,
      teacherId: input.teacherId,
      roomId: room.id,
      needsChoice: false,
    };
  }

  const room = pickRoom({
    section: input.section,
    day: input.day,
    timeSlotId: input.timeSlotId,
    rooms: input.rooms,
    lessons: input.lessons,
    excludeLessonId: input.excludeLessonId,
  });
  if (input.teacherId === '') {
    return { ok: Boolean(room), text: room ? null : noRoomText(input.section, input.rooms), teacherId: '', roomId: room?.id ?? null, needsChoice: !room };
  }

  if (room === null || room === undefined) {
    return {
      ok: false,
      text: noRoomText(input.section, input.rooms),
      teacherId: null,
      roomId: null,
      needsChoice: true,
    };
  }


  return {
    ok: true,
    text: null,
    teacherId: null,
    roomId: room.id,
    needsChoice: true,
  };
}

export function catalogSlices(catalog: ScheduleCatalog): {
  sections: Section[]
  rooms: Room[]
  blockedSlots: TeacherBlockedSlot[]
} {
  return {
    sections: catalog.sections,
    rooms: catalog.rooms,
    blockedSlots: catalog.blockedSlots,
  };
}

function teacherStopText(
  busy: ReturnType<typeof busySlots>,
  teacherId: string,
  day: WeekDay,
  timeSlotId: string,
): string | null {
  const blocked = busy.blockedReason.get(slotKey(teacherId, day, timeSlotId));
  if (blocked) return blocked;

  const teacherHit = busy.teacherAt.get(slotKey(teacherId, day, timeSlotId));
  if (teacherHit) return 'Преподаватель занят';

  return null;
}

function noRoomText(section: Section, rooms: Room[]): string {
  const fits = rooms.some((room) => room.capacity >= section.studentsCount);
  if (!fits) return 'Нет аудитории нужной вместимости';

  return 'Нет свободной аудитории';
}
