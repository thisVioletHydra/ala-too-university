import type { Lesson, Room, Section, WeekDay } from '#schedule/types.ts';

import { busySlots, slotKey } from '#schedule/busy-slots.ts';

export type PickRoomInput = {
  section: Section
  day: WeekDay
  timeSlotId: string
  rooms: Room[]
  lessons: Lesson[]
  excludeLessonId?: string
};

export function pickRoom(input: PickRoomInput): Room | null {
  const busy = busySlots(input.lessons, [], input.excludeLessonId);
  const free = input.rooms.filter((room) => {
    if (room.capacity < input.section.studentsCount) return false;

    return !busy.roomAt.has(slotKey(room.id, input.day, input.timeSlotId));
  });
  const preferred = free.filter((room) => room.type === input.section.preferredRoomType);
  const pool = preferred.length > 0 ? preferred : free;
  const sorted = [...pool].sort((left, right) => left.capacity - right.capacity);
  return sorted[0] ?? null;
}

export function roomFits(room: Room, studentsCount: number): boolean {
  return room.capacity >= studentsCount;
}
