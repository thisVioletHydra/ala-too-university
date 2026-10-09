import type { Lesson, Room, Section, TeacherBlockedSlot, WeekDay } from '#schedule/types.ts';

import { parseSchedule } from '#data/schedule.parser.ts';
import { placementConflict } from '#schedule/conflicts.ts';
import { describe, expect, it } from 'vitest';

import rawSchedule from '#data/schedule-mock-data.json';

const day: WeekDay = 'MON';

function section(patch: Partial<Section> = {}): Section {
  return {
    id: 'SEC',
    courseId: 'C',
    code: 'CS',
    studentsCount: 20,
    requiredLessonsPerWeek: 2,
    teacherId: 'T1',
    allowedTeacherIds: ['T1', 'T2'],
    preferredRoomType: 'LECTURE',
    ...patch,
  };
}

function room(patch: Partial<Room> = {}): Room {
  return {
    id: 'R1',
    name: 'A-1',
    capacity: 30,
    type: 'LECTURE',
    ...patch,
  };
}

function lesson(patch: Partial<Lesson> = {}): Lesson {
  return {
    id: 'L',
    sectionId: 'SEC',
    teacherId: 'T1',
    roomId: 'R1',
    day,
    timeSlotId: 'SLOT',
    ...patch,
  };
}

function blocked(patch: Partial<TeacherBlockedSlot> = {}): TeacherBlockedSlot {
  return {
    teacherId: 'T1',
    day,
    timeSlotId: 'SLOT',
    reason: 'Недоступен',
    ...patch,
  };
}

describe('placementConflict', () => {
  it('пропускает свободный слот', () => {
    const result = placementConflict({
      placement: { sectionId: 'SEC', teacherId: 'T1', roomId: 'R1', day, timeSlotId: 'SLOT' },
      lessons: [],
      sections: [section()],
      rooms: [room()],
      blockedSlots: [],
    });
    expect(result).toEqual({ ok: true });
  });

  it('преподаватель занят', () => {
    const result = placementConflict({
      placement: { sectionId: 'SEC2', teacherId: 'T1', roomId: 'R2', day, timeSlotId: 'SLOT' },
      lessons: [lesson({ sectionId: 'SEC', roomId: 'R1' })],
      sections: [section(), section({ id: 'SEC2', code: 'DB' })],
      rooms: [room(), room({ id: 'R2', name: 'A-2' })],
      blockedSlots: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('teacher-busy');
  });

  it('аудитория занята', () => {
    const result = placementConflict({
      placement: { sectionId: 'SEC2', teacherId: 'T2', roomId: 'R1', day, timeSlotId: 'SLOT' },
      lessons: [lesson({ teacherId: 'T9', sectionId: 'SEC' })],
      sections: [
        section({ allowedTeacherIds: ['T1', 'T9'] }),
        section({ id: 'SEC2', teacherId: 'T2', allowedTeacherIds: ['T2'] }),
      ],
      rooms: [room()],
      blockedSlots: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('room-busy');
  });

  it('мест меньше, чем студентов', () => {
    const result = placementConflict({
      placement: { sectionId: 'SEC', teacherId: 'T1', roomId: 'R201', day, timeSlotId: 'FREE' },
      lessons: [],
      sections: [section({ studentsCount: 32 })],
      rooms: [room({ id: 'R201', name: 'B-201', capacity: 30 })],
      blockedSlots: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('room-small');
  });

  it('ровно мест хватает', () => {
    const result = placementConflict({
      placement: { sectionId: 'SEC', teacherId: 'T1', roomId: 'LAB1', day, timeSlotId: 'FREE' },
      lessons: [],
      sections: [section({ studentsCount: 18, preferredRoomType: 'COMPUTER_LAB' })],
      rooms: [room({ id: 'LAB1', name: 'LAB-1', capacity: 18, type: 'COMPUTER_LAB' })],
      blockedSlots: [],
    });
    expect(result).toEqual({ ok: true });
  });

  it('преподаватель недоступен, и это важнее занятой аудитории', () => {
    const result = placementConflict({
      placement: {
        sectionId: 'SEC_CS101_02',
        teacherId: 'T2',
        roomId: 'HALL1',
        day: 'FRI',
        timeSlotId: 'SLOT_1300',
      },
      lessons: [lesson({
        id: 'L7',
        sectionId: 'SEC_PHY',
        teacherId: 'T6',
        roomId: 'HALL1',
        day: 'FRI',
        timeSlotId: 'SLOT_1300',
      })],
      sections: [
        section({
          id: 'SEC_CS101_02',
          studentsCount: 32,
          teacherId: 'T2',
          allowedTeacherIds: ['T1', 'T2'],
        }),
        section({ id: 'SEC_PHY', teacherId: 'T6', allowedTeacherIds: ['T6'], studentsCount: 35 }),
      ],
      rooms: [room({ id: 'HALL1', name: 'Hall-1', capacity: 60 })],
      blockedSlots: [blocked({ teacherId: 'T2', day: 'FRI', timeSlotId: 'SLOT_1300', reason: 'Недоступен' })],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('teacher-blocked');
      expect(result.text).toBe('Недоступен');
    }
  });

  it('секция уже в этом слоте', () => {
    const result = placementConflict({
      placement: { sectionId: 'SEC', teacherId: 'T2', roomId: 'R2', day, timeSlotId: 'SLOT' },
      lessons: [lesson()],
      sections: [section()],
      rooms: [room(), room({ id: 'R2', name: 'A-2' })],
      blockedSlots: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('section-busy');
  });

  it('перенос не конфликтует сам с собой', () => {
    const result = placementConflict({
      placement: { sectionId: 'SEC', teacherId: 'T1', roomId: 'R1', day: 'TUE', timeSlotId: 'NEXT' },
      lessons: [lesson({ id: 'L1' })],
      sections: [section()],
      rooms: [room()],
      blockedSlots: [],
      excludeLessonId: 'L1',
    });
    expect(result).toEqual({ ok: true });
  });

  it('бросок в ту же ячейку пустой', () => {
    const result = placementConflict({
      placement: { sectionId: 'SEC', teacherId: 'T1', roomId: 'R1', day, timeSlotId: 'SLOT' },
      lessons: [lesson({ id: 'L1' })],
      sections: [section()],
      rooms: [room()],
      blockedSlots: [],
      excludeLessonId: 'L1',
    });
    expect(result).toEqual({ ok: true });
  });

  it('десять занятий из mock на своих местах чистые', () => {
    const catalog = parseSchedule(rawSchedule);
    for (const item of catalog.lessons) {
      const result = placementConflict({
        placement: item,
        lessons: catalog.lessons,
        sections: catalog.sections,
        rooms: catalog.rooms,
        blockedSlots: catalog.blockedSlots,
        excludeLessonId: item.id,
      });
      expect(result).toEqual({ ok: true });
    }
  });
});
