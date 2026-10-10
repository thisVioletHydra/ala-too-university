import type { WeekDay } from '#schedule/types.ts';

import { sectionTeacher } from '#schedule/section.teacher.ts';
import { useSchedule } from '#app/schedule.store.ts';
import { explainSlot } from '#schedule/conflicts.ts';

type AssignOutcome =
  | { type: 'placed' }
  | {
    type: 'edit'
    teacherId: string | null
    roomId: string | null
    text: string | null
  }
  | { type: 'rejected', text: string };

type AssignRequest = {
  sectionId: string
  teacherId?: string
  roomId?: string
  day: WeekDay
  timeSlotId: string
};

export function assignLesson(input: AssignRequest): AssignOutcome {
  const { catalog, lessons, rememberedTeachers, placeLesson } = useSchedule.getState();
  if (catalog === null || catalog === undefined) return { type: 'rejected', text: 'Расписание ещё не загружено' };

  const section = catalog.sections.find((item) => item.id === input.sectionId);
  if (section === null || section === undefined) return { type: 'rejected', text: 'Секция не найдена' };

  const teacherId = sectionTeacher(section, lessons, rememberedTeachers);
  const advice = explainSlot({
    section,
    day: input.day,
    timeSlotId: input.timeSlotId,
    lessons,
    rooms: catalog.rooms,
    sections: catalog.sections,
    blockedSlots: catalog.blockedSlots,
    teacherId,
    roomId: input.roomId ?? null,
  });

  if (!advice.ok && !advice.needsChoice) {
    return { type: 'rejected', text: advice.text ?? 'Этот слот занят' };
  }

  if (advice.needsChoice || advice.teacherId === null || !advice.roomId) {
    return {
      type: 'edit',
      teacherId: advice.teacherId,
      roomId: advice.roomId,
      text: advice.text,
    };
  }

  const placed = placeLesson({
    sectionId: section.id,
    teacherId: advice.teacherId,
    roomId: advice.roomId,
    day: input.day,
    timeSlotId: input.timeSlotId,
  });
  if (!placed.ok) return { type: 'rejected', text: placed.text };

  return { type: 'placed' };
}
