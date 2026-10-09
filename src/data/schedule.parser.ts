import type {
  ScheduleCatalog,
  ScheduleMeta,
  WeekDayMeta,
  TimeSlot,
  Course,
  Teacher,
  Room,
  Section,
  TeacherBlockedSlot,
  Lesson,
  WeekDay,
  RoomType,
} from '#schedule/types.ts';

import rawSchedule from '#data/schedule-mock-data.json';

const LOAD_DELAY_MS = 400;

const WEEK_DAYS: ReadonlySet<string> = new Set(['MON', 'TUE', 'WED', 'THU', 'FRI']);
const ROOM_TYPES: ReadonlySet<string> = new Set(['LECTURE', 'COMPUTER_LAB']);

export async function loadSchedule(input?: { fail?: boolean }): Promise<ScheduleCatalog> {
  await new Promise((resolve) => {
    setTimeout(resolve, LOAD_DELAY_MS);
  });

  if (input?.fail) {
    throw new Error('Не удалось загрузить расписание');
  }

  return parseSchedule(rawSchedule);
}

export function parseSchedule(value: unknown): ScheduleCatalog {
  const root = record(value, 'расписание');

  const meta = parseMeta(root.meta);

  return {
    meta,
    weekDays: meta.weekDays,
    timeSlots: arrayOf(root.timeSlots, 'слоты', parseTimeSlot),
    courses: arrayOf(root.courses, 'курсы', parseCourse),
    teachers: arrayOf(root.teachers, 'преподаватели', parseTeacher),
    rooms: arrayOf(root.rooms, 'аудитории', parseRoom),
    sections: arrayOf(root.sections, 'секции', parseSection),
    blockedSlots: arrayOf(root.teacherBlockedSlots, 'блоки', parseBlocked),
    lessons: arrayOf(root.lessons, 'занятия', parseLesson),
  };
}

function parseMeta(value: unknown): ScheduleMeta {
  const item = record(value, 'meta');

  return {
    title: text(item.title, 'заголовок'),
    version: count(item.version, 'версия'),
    weekDays: arrayOf(item.weekDays, 'дни', parseWeekDay),
  };
}

function parseWeekDay(value: unknown): WeekDayMeta {
  const item = record(value, 'день');

  return {
    id: weekDay(item.id),
    label: text(item.label, 'название дня'),
  };
}

function parseTimeSlot(value: unknown): TimeSlot {
  const item = record(value, 'слот');

  return {
    id: text(item.id, 'id слота'),
    start: text(item.start, 'начало'),
    end: text(item.end, 'конец'),
  };
}

function parseCourse(value: unknown): Course {
  const item = record(value, 'курс');

  return {
    id: text(item.id, 'id курса'),
    code: text(item.code, 'код курса'),
    name: text(item.name, 'название курса'),
  };
}

function parseTeacher(value: unknown): Teacher {
  const item = record(value, 'преподаватель');

  return {
    id: text(item.id, 'id преподавателя'),
    name: text(item.name, 'имя'),
    shortName: text(item.shortName, 'короткое имя'),
  };
}

function parseRoom(value: unknown): Room {
  const item = record(value, 'аудитория');

  return {
    id: text(item.id, 'id аудитории'),
    name: text(item.name, 'название аудитории'),
    capacity: count(item.capacity, 'вместимость'),
    type: roomType(item.type),
  };
}

function parseSection(value: unknown): Section {
  const item = record(value, 'секция');

  return {
    id: text(item.id, 'id секции'),
    courseId: text(item.courseId, 'курс секции'),
    code: text(item.code, 'код секции'),
    studentsCount: count(item.studentsCount, 'студенты'),
    requiredLessonsPerWeek: count(item.requiredLessonsPerWeek, 'норма'),
    teacherId: item.teacherId === null ? null : text(item.teacherId, 'преподаватель секции'),
    allowedTeacherIds: arrayOf(item.allowedTeacherIds, 'допустимые преподаватели', (entry) =>
      text(entry, 'id преподавателя'),
    ),
    preferredRoomType: roomType(item.preferredRoomType),
  };
}

function parseBlocked(value: unknown): TeacherBlockedSlot {
  const item = record(value, 'блок');

  return {
    teacherId: text(item.teacherId, 'преподаватель блока'),
    day: weekDay(item.day),
    timeSlotId: text(item.timeSlotId, 'слот блока'),
    reason: text(item.reason, 'причина'),
  };
}

function parseLesson(value: unknown): Lesson {
  const item = record(value, 'занятие');

  return {
    id: text(item.id, 'id занятия'),
    sectionId: text(item.sectionId, 'секция занятия'),
    teacherId: text(item.teacherId, 'преподаватель занятия'),
    roomId: text(item.roomId, 'аудитория занятия'),
    day: weekDay(item.day),
    timeSlotId: text(item.timeSlotId, 'слот занятия'),
  };
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Ожидался объект: ${label}`);
  }

  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Ожидалась строка: ${label}`);
  }

  return value;
}

function count(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`Ожидалось число: ${label}`);
  }

  return value;
}

function weekDay(value: unknown): WeekDay {
  const day = text(value, 'день недели');
  if (WEEK_DAYS.has(day)) return day as WeekDay;

  throw new Error(`Неизвестный день: ${day}`);
}

function roomType(value: unknown): RoomType {
  const type = text(value, 'тип аудитории');
  if (ROOM_TYPES.has(type)) return type as RoomType;

  throw new Error(`Неизвестный тип аудитории: ${type}`);
}

function arrayOf<T>(value: unknown, label: string, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Ожидался список: ${label}`);
  }

  return value.map(parse);
}