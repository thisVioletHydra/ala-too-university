import type { ScheduleCatalog } from '#schedule/types.ts';

import { afterEach, expect, it } from 'vitest';
import { useSchedule } from '#app/schedule.store.ts';
import { adviceMap } from '#app/board.derived.ts';
import { assignLesson } from './lesson.assign.ts';

const catalog: ScheduleCatalog = {
  meta: { title: 'Тест', version: 1, weekDays: [] },
  weekDays: [{ id: 'MON', label: 'Понедельник' }, { id: 'TUE', label: 'Вторник' }],
  timeSlots: [{ id: 'S', start: '10:00', end: '11:20' }],
  courses: [],
  teachers: [],
  blockedSlots: [],
  rooms: [
    { id: 'R1', name: 'A-102', capacity: 30, type: 'LECTURE' },
    { id: 'R2', name: 'B-201', capacity: 30, type: 'LECTURE' },
  ],
  sections: [
    { id: 'A', courseId: 'C1', code: 'CS101', studentsCount: 20, requiredLessonsPerWeek: 2, teacherId: 'T1', allowedTeacherIds: ['T1'], preferredRoomType: 'LECTURE' },
    { id: 'B', courseId: 'C2', code: 'ENG110', studentsCount: 20, requiredLessonsPerWeek: 2, teacherId: 'T2', allowedTeacherIds: ['T2'], preferredRoomType: 'LECTURE' },
  ],
  lessons: [
    { id: 'source', sectionId: 'A', teacherId: 'T1', roomId: 'R1', day: 'MON', timeSlotId: 'S' },
    { id: 'occupied', sectionId: 'B', teacherId: 'T2', roomId: 'R1', day: 'TUE', timeSlotId: 'S' },
  ],
};
const previousState = useSchedule.getState();
afterEach(() => useSchedule.setState(previousState));

it('Shift и обычный перенос проверяют одну аудиторию, даже если другая свободна', () => {
  const active = { kind: 'lesson', lessonId: 'source', copy: false } as const;
  const normal = adviceMap(catalog, catalog.lessons, {}, active, false).get('TUE|S');
  const copy = adviceMap(catalog, catalog.lessons, {}, active, true).get('TUE|S');
  expect(normal).toMatchObject({ ok: false, roomId: 'R1', text: 'Аудитория занята' });
  expect(copy).toMatchObject({ ok: false, roomId: 'R1', text: 'Аудитория занята' });
});

it('копирование в занятую аудиторию предлагает редактор и не создаёт копию автоматически', () => {
  useSchedule.setState({ catalog, lessons: catalog.lessons, rememberedTeachers: {}, past: [], future: [] });
  const outcome = assignLesson({ sectionId: 'A', roomId: 'R1', day: 'TUE', timeSlotId: 'S' });
  expect(outcome).toMatchObject({ type: 'edit', roomId: 'R1', text: 'Аудитория занята' });
  expect(useSchedule.getState().lessons).toEqual(catalog.lessons);
});
