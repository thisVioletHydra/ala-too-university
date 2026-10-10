import type { Lesson, ScheduleCatalog } from '#schedule/types.ts';
import type { SummaryInput } from './scheduleSummary.model.ts';

import { describe, expect, it } from 'vitest';
import { adviceMap, handToDrag } from '#app/board.derived.ts';
import { emptyHold } from '#interaction/types.ts';
import { transferSummary } from './scheduleSummary.model.ts';

const catalog: ScheduleCatalog = {
  meta: { title: 'Тест', version: 1, weekDays: [] },
  weekDays: [{ id: 'MON', label: 'Понедельник' }, { id: 'TUE', label: 'Вторник' }],
  timeSlots: [{ id: 'S1', start: '08:30', end: '09:50' }, { id: 'S2', start: '10:00', end: '11:20' }],
  courses: [],
  teachers: [{ id: 'T', name: 'Иванов', shortName: 'А. Иванов' }],
  rooms: [{ id: 'R', name: 'B-201', capacity: 30, type: 'LECTURE' }],
  sections: [
    { id: 'A', courseId: 'C1', code: 'CS101-01', studentsCount: 20, requiredLessonsPerWeek: 2, teacherId: 'T', allowedTeacherIds: ['T'], preferredRoomType: 'LECTURE' },
    { id: 'B', courseId: 'C2', code: 'DB202-01', studentsCount: 20, requiredLessonsPerWeek: 2, teacherId: 'T', allowedTeacherIds: ['T'], preferredRoomType: 'LECTURE' },
  ],
  blockedSlots: [],
  lessons: [],
};
const source: Lesson = { id: 'source', sectionId: 'A', teacherId: 'T', roomId: 'R', day: 'MON', timeSlotId: 'S1' };
const occupied: Lesson = { ...source, id: 'occupied', sectionId: 'B', day: 'TUE', timeSlotId: 'S2' };

function input(lessons: Lesson[] = [], patch: Partial<SummaryInput['board']> = {}): SummaryInput {
  const board: SummaryInput['board'] = {
    ghost: { kind: 'section', sectionId: 'A' },
    hold: emptyHold,
    repeat: false,
    overKey: 'TUE|S2',
    overUnassign: false,
    advice: new Map(),
    ...patch,
  };
  board.advice = adviceMap(catalog, lessons, {}, board.ghost ?? handToDrag(board.hold.hand, board.repeat), board.repeat);
  return { catalog, lessons, board };
}

describe('полоска состояния расписания', () => {
  it('возвращается к счётчикам после отпускания карточки', () => {
    expect(transferSummary(input([], { ghost: null }))).toBeNull();
  });

  it('показывает одну конкретную причину для мыши и клавиатуры', () => {
    const pointer = transferSummary(input([occupied]));
    const keyboard = transferSummary(input([occupied], { ghost: null, hold: { ...emptyHold, hand: { kind: 'section', sectionId: 'A' } } }));
    expect(pointer).toEqual(keyboard);
    expect(pointer).toMatchObject({ tone: 'bad', title: 'Нельзя поставить', detail: 'А. Иванов уже ведёт DB202-01 в это время', destination: 'Вторник, 10:00–11:20' });
  });

  it('называет занятую аудиторию и занимающую её секцию', () => {
    const result = transferSummary(input([source, { ...occupied, teacherId: 'OTHER' }], { ghost: { kind: 'lesson', lessonId: 'source', copy: false } }));
    expect(result?.detail).toBe('Аудитория B-201 занята: DB202-01');
  });

  it('различает конфликт секции и отсутствие свободных аудиторий', () => {
    const duplicate = transferSummary(input([{ ...occupied, sectionId: 'A' }]));
    expect(duplicate?.detail).toBe('У секции CS101-01 уже есть занятие в это время');
    const busyRooms = transferSummary(input([{ ...occupied, teacherId: 'OTHER' }]));
    expect(busyRooms?.detail).toBe('Все аудитории на 20 и более мест заняты в это время');
  });

  it('не показывает исходное место переноса как ошибку', () => {
    const result = transferSummary(input([source], { ghost: { kind: 'lesson', lessonId: 'source', copy: false }, overKey: 'MON|S1' }));
    expect(result).toMatchObject({ tone: 'neutral', title: 'Исходное место' });
  });

  it('при Shift сообщает об удалении существующего занятия', () => {
    const result = transferSummary(input([{ ...occupied, sectionId: 'A' }], { repeat: true }));
    expect(result).toMatchObject({ tone: 'warning', title: 'Убрать занятие' });
  });

  it('предлагает редактор для секции без назначенного преподавателя', () => {
    const state = input();
    state.catalog = { ...catalog, sections: [{ ...catalog.sections[0]!, teacherId: null }] };
    state.board.advice = adviceMap(state.catalog, [], {}, state.board.ghost, false);
    expect(transferSummary(state)).toMatchObject({ title: 'Открыть редактор', tone: 'warning' });
  });

  it('возврат занятия в список показывает удаление, а не конфликт цели', () => {
    expect(transferSummary(input([source], { ghost: { kind: 'lesson', lessonId: 'source', copy: false }, overUnassign: true }))).toMatchObject({ title: 'Убрать из расписания', tone: 'warning' });
  });
});
