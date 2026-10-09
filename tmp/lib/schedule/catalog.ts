import type { Course, Lesson, Room, ScheduleData, Section, Teacher, WeekDay } from './types'

/** Индексы справочников, чтобы не искать по массивам в каждом рендере. */
export interface Catalog {
  data: ScheduleData
  sections: Map<string, Section>
  courses: Map<string, Course>
  teachers: Map<string, Teacher>
  rooms: Map<string, Room>
  blocked: Set<string>
  dayLabel: Map<WeekDay, string>
}

export const cellKey = (day: WeekDay, timeSlotId: string) => `${day}|${timeSlotId}`

export function buildCatalog(data: ScheduleData): Catalog {
  return {
    data,
    sections: new Map(data.sections.map((s) => [s.id, s])),
    courses: new Map(data.courses.map((c) => [c.id, c])),
    teachers: new Map(data.teachers.map((t) => [t.id, t])),
    rooms: new Map(data.rooms.map((r) => [r.id, r])),
    blocked: new Set(data.teacherBlockedSlots.map((b) => `${b.teacherId}|${cellKey(b.day, b.timeSlotId)}`)),
    dayLabel: new Map(data.meta.weekDays.map((d) => [d.id, d.label])),
  }
}

export function groupLessonsByCell(lessons: Lesson[]) {
  const map = new Map<string, Lesson[]>()
  for (const lesson of lessons) {
    const key = cellKey(lesson.day, lesson.timeSlotId)
    const list = map.get(key)
    if (list) list.push(lesson)
    else map.set(key, [lesson])
  }
  return map
}

export function countLessonsBySection(lessons: Lesson[]) {
  const map = new Map<string, number>()
  for (const lesson of lessons) map.set(lesson.sectionId, (map.get(lesson.sectionId) ?? 0) + 1)
  return map
}

export function lastName(teacher: Teacher) {
  return teacher.shortName.split(' ').slice(-1)[0]
}

export function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

export const ROOM_TYPE_LABEL = {
  LECTURE: 'Лекционная',
  COMPUTER_LAB: 'Компьютерный класс',
} as const

const COURSE_HUES = [265, 220, 75, 350, 185, 35, 300, 150, 10]

/** Мягкий пастельный цвет для каждого предмета — помогает узнавать занятия глазами. */
export function courseHue(catalog: Catalog, courseId: string) {
  const index = catalog.data.courses.findIndex((c) => c.id === courseId)
  return COURSE_HUES[(index < 0 ? 0 : index) % COURSE_HUES.length]
}
