import type { Lesson, Room, Section, WeekDay } from '#schedule/types.ts';

import { busySlots, slotKey } from '#schedule/slots.busy.ts';

type PickRoomInput = {
  section: Section
  day: WeekDay
  timeSlotId: string
  rooms: Room[]
  lessons: Lesson[]
  excludeLessonId?: string
};

export function pickRoom(input: PickRoomInput): Room | null {
  const busy = busySlots(input.lessons, [], input.excludeLessonId);
  let smallest: Room | null = null;
  let preferred: Room | null = null;
  for (const room of input.rooms) {
    if (room.capacity < input.section.studentsCount) continue;

    if (busy.roomAt.has(slotKey(room.id, input.day, input.timeSlotId))) continue;

    if (smallest === null || room.capacity < smallest.capacity) smallest = room;

    if (room.type === input.section.preferredRoomType) {
      if (preferred === null || room.capacity < preferred.capacity) preferred = room;
    }
  }

  return preferred ?? smallest;
}
