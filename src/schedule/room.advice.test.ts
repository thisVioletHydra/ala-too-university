import type { Room, Section } from '#schedule/types.ts';

import { explainSlot } from '#schedule/conflicts.ts';
import { describe, expect, it } from 'vitest';

function section(patch: Partial<Section> = {}): Section {
  return {
    id: 'SEC',
    courseId: 'C1',
    code: 'CS101-01',
    studentsCount: 30,
    requiredLessonsPerWeek: 2,
    teacherId: null,
    allowedTeacherIds: ['T1'],
    preferredRoomType: 'LECTURE',
    ...patch,
  };
}

function room(patch: Partial<Room> = {}): Room {
  return { id: 'R1', name: 'A-1', capacity: 20, type: 'LECTURE', ...patch };
}

function advice(rooms: Room[]) {
  const item = section();
  return explainSlot({
    section: item,
    day: 'MON',
    timeSlotId: 'S1',
    lessons: [],
    rooms,
    sections: [item],
    blockedSlots: [],
    teacherId: 'T1',
    roomId: null,
  });
}

// Подсказка различает «нет подходящей вместимости» и «всё занято».
describe('explainSlot: подбор аудитории', () => {
  it('сообщает о вместимости, когда ни одна аудитория не подходит', () => {
    const result = advice([room({ capacity: 20 }), room({ id: 'R2', capacity: 10 })]);

    expect(result.ok).toBe(false);
    expect(result.text).toBe('Нет аудитории нужной вместимости');
  });

  it('сообщает о занятости, когда подходящая по размеру есть, но свободных нет', () => {
    const result = explainSlot({
      section: section({ studentsCount: 10 }),
      day: 'MON',
      timeSlotId: 'S1',
      lessons: [{ id: 'L1', sectionId: 'OTHER', teacherId: 'T2', roomId: 'R1', day: 'MON', timeSlotId: 'S1' }],
      rooms: [room({ capacity: 30 })],
      sections: [section({ id: 'OTHER' })],
      blockedSlots: [],
      teacherId: 'T1',
      roomId: null,
    });

    expect(result.ok).toBe(false);
    expect(result.text).toBe('Нет свободной аудитории');
  });
});
