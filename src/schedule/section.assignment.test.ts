import type { Lesson, Room, Section } from '#schedule/types.ts';

import { sectionAssignmentConflict } from '#schedule/section.assignment.ts';
import { describe, expect, it } from 'vitest';

function section(patch: Partial<Section> = {}): Section {
  return {
    id: 'SEC',
    courseId: 'C1',
    code: 'CS101-01',
    studentsCount: 20,
    requiredLessonsPerWeek: 2,
    teacherId: 'T1',
    allowedTeacherIds: ['T1'],
    preferredRoomType: 'LECTURE',
    ...patch,
  };
}

function lesson(patch: Partial<Lesson> = {}): Lesson {
  return { id: 'L1', sectionId: 'SEC', teacherId: 'T1', roomId: 'R1', day: 'MON', timeSlotId: 'S1', ...patch };
}

function room(patch: Partial<Room> = {}): Room {
  return { id: 'R1', name: 'A-1', capacity: 30, type: 'LECTURE', ...patch };
}

const catalog = {
  meta: { title: '', version: 1, weekDays: [] },
  weekDays: [],
  timeSlots: [],
  courses: [],
  teachers: [],
  rooms: [room()],
  sections: [section()],
  blockedSlots: [],
  lessons: [],
};

// Валидация целиком: преподаватель должен вести секцию, иначе сделка отклоняется.
describe('sectionAssignmentConflict', () => {
  it('пропускает преподавателя из allowedTeacherIds', () => {
    const result = sectionAssignmentConflict({
      catalog,
      lessons: [],
      rememberedTeachers: {},
      sectionId: 'SEC',
      teacherId: 'T1',
    });
    expect(result).toEqual({ ok: true });
  });

  it('отклоняет преподавателя, который не ведёт секцию', () => {
    const result = sectionAssignmentConflict({
      catalog,
      lessons: [],
      rememberedTeachers: {},
      sectionId: 'SEC',
      teacherId: 'T9',
    });
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: 'teacher-not-allowed' });
  });

  it('отклоняет второго преподавателя той же дисциплины', () => {
    const other = section({ id: 'SEC2', code: 'CS101-02' });
    const result = sectionAssignmentConflict({
      catalog: { ...catalog, sections: [section(), other] },
      lessons: [lesson({ id: 'L2', sectionId: 'SEC2' })],
      rememberedTeachers: {},
      sectionId: 'SEC',
      teacherId: 'T1',
    });
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ kind: 'teacher-not-allowed' });
  });

  it('сообщает, что секция не найдена', () => {
    const result = sectionAssignmentConflict({
      catalog,
      lessons: [],
      rememberedTeachers: {},
      sectionId: 'NOPE',
    });
    expect(result).toMatchObject({ ok: false, kind: 'section-busy' });
  });
});
