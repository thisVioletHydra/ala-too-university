import type { Dataset } from '#app/schedule.store.ts';
import type { Lesson, WeekDay } from '#schedule/types.ts';

const STORAGE_KEY = 'ala-too-lessons';

const DATASETS: ReadonlySet<string> = new Set(['bulk', 'mock']);
const WEEK_DAYS: ReadonlySet<string> = new Set(['MON', 'TUE', 'WED', 'THU', 'FRI']);

export type StoredSchedule = {
  dataset: Dataset | null;
  lessons: Lesson[];
  past: Lesson[][];
  future: Lesson[][];
};

export function readStoredSchedule(): StoredSchedule | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (localStorage.getItem('ala-too-section-teacher-v2') !== 'ready') {
    const empty: StoredSchedule = { dataset: 'mock', lessons: [], past: [], future: [] };
    writeStoredSchedule(empty);
    localStorage.setItem('ala-too-section-teacher-v2', 'ready');

    return empty;
  }

  if (raw === null) return null;

  try {
    return parseStored(JSON.parse(raw));
  } catch (error) {
    console.error('Не удалось прочитать сохранённое расписание', error);

    return null;
  }
}

export function writeStoredSchedule(schedule: StoredSchedule): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}

function parseStored(value: unknown): StoredSchedule {
  const record = asRecord(value, 'сохранение');

  return {
    dataset: asDataset(record.dataset),
    lessons: asLessonList(record.lessons),
    past: asLessonMatrix(record.past),
    future: asLessonMatrix(record.future),
  };
}

function asDataset(value: unknown): Dataset | null {
  return typeof value === 'string' && DATASETS.has(value) ? (value as Dataset) : null;
}

function asLessonMatrix(value: unknown): Lesson[][] {
  return Array.isArray(value) ? value.map(asLessonList) : [];
}

function asLessonList(value: unknown): Lesson[] {
  if (!Array.isArray(value)) throw new TypeError('Список занятий сломан');

  return value.map(asLesson);
}

function asLesson(value: unknown): Lesson {
  const item = asRecord(value, 'занятие');

  return {
    id: asString(item.id),
    sectionId: asString(item.sectionId),
    teacherId: item.teacherId === '' ? '' : asString(item.teacherId),
    roomId: asString(item.roomId),
    day: asWeekDay(item.day),
    timeSlotId: asString(item.timeSlotId),
  };
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`Сломано: ${label}`);
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('Поле занятия сломано');
  }

  return value;
}

function asWeekDay(value: unknown): WeekDay {
  if (typeof value === 'string' && WEEK_DAYS.has(value)) return value as WeekDay;

  throw new TypeError('День занятия сломан');
}
