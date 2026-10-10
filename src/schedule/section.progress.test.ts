import type { Lesson, Section } from '#schedule/types.ts';

import { sectionProgress } from '#schedule/section.progress.ts';
import { describe, expect, it } from 'vitest';

const section: Section = {
  id: 'SEC',
  courseId: 'C',
  code: 'CS',
  studentsCount: 10,
  requiredLessonsPerWeek: 2,
  teacherId: 'T1',
  allowedTeacherIds: ['T1'],
  preferredRoomType: 'LECTURE',
};

function lesson(id: string): Lesson {
  return {
    id,
    sectionId: 'SEC',
    teacherId: 'T1',
    roomId: 'R',
    day: 'MON',
    timeSlotId: id,
  };
}

describe('sectionProgress', () => {
  it('пусто, частично, готово и сверх нормы', () => {
    expect(sectionProgress(section, []).state).toBe('empty');
    expect(sectionProgress(section, [lesson('a')])).toMatchObject({ placed: 1, state: 'partial' });
    expect(sectionProgress(section, [lesson('a'), lesson('b')]).state).toBe('done');
    expect(sectionProgress(section, [lesson('a'), lesson('b'), lesson('c')])).toMatchObject({
      placed: 3,
      required: 2,
      state: 'done',
    });
  });
});
