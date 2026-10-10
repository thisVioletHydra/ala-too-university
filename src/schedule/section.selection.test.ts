import type { Lesson, Section } from './types.ts';

import { describe, expect, it } from 'vitest';
import { selectSections } from './section.selection.ts';

function section(id: string, courseId: string, teacherId: string | null): Section {
  return { id, courseId, teacherId, code: id, studentsCount: 10, requiredLessonsPerWeek: 1, allowedTeacherIds: [], preferredRoomType: 'LECTURE' };
}

const sections = [section('a', 'second', null), section('b', 'first', 'T2'), section('c', 'second', 'T1')];
const lessons: Lesson[] = [
  { id: '1', sectionId: 'b', teacherId: 'T2', roomId: 'R', day: 'MON', timeSlotId: '1' },
  { id: '2', sectionId: 'b', teacherId: 'T2', roomId: 'R', day: 'MON', timeSlotId: '2' },
];

describe('selectSections', () => {
  it('сохраняет порядок первого появления дисциплин и исходный порядок секций внутри группы', () => {
    const result = selectSections({ sections, lessons, remembered: {}, mode: 'all', groupBy: 'course', teacherId: 'T2' });
    expect(result.visible.map((item) => item.id)).toEqual(['a', 'c', 'b']);
  });

  it('считает все статусы независимо от активного фильтра преподавателя', () => {
    const result = selectSections({ sections, lessons, remembered: {}, mode: 'done', groupBy: 'teacher', teacherId: 'T2' });
    expect(result.visible.map((item) => item.id)).toEqual(['b']);
    expect(result.counts).toEqual({ all: 3, done: 1, 'not-done': 2, 'no-teacher': 1, excess: 1 });
  });

  it('учитывает сохранённого преподавателя и явное отсутствие преподавателя в занятии', () => {
    const unassigned = [{ ...lessons[0]!, sectionId: 'c', teacherId: '' }];
    const result = selectSections({ sections, lessons: unassigned, remembered: { a: 'T1' }, mode: 'no-teacher', groupBy: 'teacher', teacherId: '' });
    expect(result.visible.map((item) => item.id)).toEqual(['c']);
    expect(result.counts['no-teacher']).toBe(1);
  });
});
