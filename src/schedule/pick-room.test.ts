import type { Lesson, Section } from '#schedule/types.ts';

import { parseSchedule } from '#data/schedule.parser.ts';
import { pickRoom } from '#schedule/pick-room.ts';
import { describe, expect, it } from 'vitest';

import rawSchedule from '#data/schedule-mock-data.json';

const catalog = parseSchedule(rawSchedule);

function byId(id: string): Section {
  const found = catalog.sections.find((item) => item.id === id);
  if (found === null || found === undefined) throw new Error(id);

  return found;
}

describe('pickRoom', () => {
  it('не сажает 24 студента в лабу на 18', () => {
    const room = pickRoom({
      section: byId('SEC_CS101_01'),
      day: 'FRI',
      timeSlotId: 'SLOT_0830',
      rooms: catalog.rooms,
      lessons: [],
    });
    expect(room).not.toBeNull();
    expect(room?.id).not.toBe('LAB1');
    expect(room?.type).toBe('LECTURE');
    expect(room && room.capacity >= 24).toBe(true);
  });

  it('берёт лабу, когда мест ровно столько', () => {
    const room = pickRoom({
      section: byId('SEC_DB202_01'),
      day: 'FRI',
      timeSlotId: 'SLOT_0830',
      rooms: catalog.rooms,
      lessons: [],
    });
    expect(room?.id).toBe('LAB1');
  });

  it('если предпочтительная занята, берёт другую свободную', () => {
    const blocking: Lesson = {
      id: 'BUSY',
      sectionId: 'SEC_CS205_01',
      teacherId: 'T1',
      roomId: 'LAB1',
      day: 'FRI',
      timeSlotId: 'SLOT_0830',
    };
    const room = pickRoom({
      section: byId('SEC_DB202_01'),
      day: 'FRI',
      timeSlotId: 'SLOT_0830',
      rooms: catalog.rooms,
      lessons: [blocking],
    });
    expect(room).not.toBeNull();
    expect(room?.id).not.toBe('LAB1');
    expect(room && room.capacity >= 18).toBe(true);
  });

  it('возвращает пусто, когда подходящей аудитории нет', () => {
    const huge: Section = {
      ...byId('SEC_CS101_02'),
      studentsCount: 200,
    };
    const room = pickRoom({
      section: huge,
      day: 'FRI',
      timeSlotId: 'SLOT_0830',
      rooms: catalog.rooms,
      lessons: [],
    });
    expect(room).toBeNull();
  });
});
