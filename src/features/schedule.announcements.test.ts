import type { Lesson } from '#schedule/types.ts';

import { expect, it } from 'vitest';
import { scheduleChangeMessage } from './schedule.announcements.ts';

const lesson: Lesson = { id: '1', sectionId: 'S', teacherId: 'T', roomId: 'R', day: 'MON', timeSlotId: '1' };

it('объявляет добавление и удаление', () => {
  expect(scheduleChangeMessage([], [lesson])).toBe('Занятие добавлено в расписание');
  expect(scheduleChangeMessage([lesson], [])).toBe('Занятие удалено из расписания');
});

it('различает перенос и редактирование', () => {
  expect(scheduleChangeMessage([lesson], [{ ...lesson, day: 'TUE' }])).toBe('Занятие перемещено');
  expect(scheduleChangeMessage([lesson], [{ ...lesson, roomId: 'OTHER' }])).toBe('Расписание обновлено');
});
