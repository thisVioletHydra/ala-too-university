import { cellKey, lastName, type Catalog } from './catalog'
import type { Cell, Lesson, PlacementSource, Room, Section } from './types'

export type ConflictCode =
  | 'SECTION_BUSY'
  | 'TEACHER_BLOCKED'
  | 'TEACHER_BUSY'
  | 'NO_TEACHER'
  | 'ROOM_BUSY'
  | 'ROOM_TOO_SMALL'
  | 'NO_ROOM'

export interface Conflict {
  code: ConflictCode
  /** Короткая причина, помещается прямо в ячейку. */
  short: string
  /** Полное объяснение для подсказки и уведомления. */
  message: string
}

export type Evaluation =
  | {
      ok: true
      teacherId: string | null
      roomId: string
      roomChanged: boolean
      needsTeacher: boolean
    }
  | { ok: false; conflicts: Conflict[] }

interface Context {
  catalog: Catalog
  lessons: Lesson[]
}

function lessonsAt({ lessons }: Context, cell: Cell, ignoreLessonId?: string) {
  return lessons.filter(
    (l) => l.day === cell.day && l.timeSlotId === cell.timeSlotId && l.id !== ignoreLessonId,
  )
}

function sectionCode(ctx: Context, sectionId: string) {
  return ctx.catalog.sections.get(sectionId)?.code ?? 'другое занятие'
}

export function checkSection(ctx: Context, sectionId: string, cell: Cell, ignoreLessonId?: string): Conflict | null {
  const clash = lessonsAt(ctx, cell, ignoreLessonId).some((l) => l.sectionId === sectionId)
  if (!clash) return null
  return {
    code: 'SECTION_BUSY',
    short: 'Уже стоит здесь',
    message: 'У этой секции уже есть занятие в это время.',
  }
}

export function checkTeacher(ctx: Context, teacherId: string, cell: Cell, ignoreLessonId?: string): Conflict | null {
  const teacher = ctx.catalog.teachers.get(teacherId)
  const name = teacher ? lastName(teacher) : 'Преподаватель'

  if (ctx.catalog.blocked.has(`${teacherId}|${cellKey(cell.day, cell.timeSlotId)}`)) {
    return {
      code: 'TEACHER_BLOCKED',
      short: `${name}: не может`,
      message: `${teacher?.shortName ?? name} не может вести занятия в это время.`,
    }
  }

  const busy = lessonsAt(ctx, cell, ignoreLessonId).find((l) => l.teacherId === teacherId)
  if (busy) {
    return {
      code: 'TEACHER_BUSY',
      short: `${name}: ведёт ${sectionCode(ctx, busy.sectionId)}`,
      message: `${teacher?.shortName ?? name} в это время ведёт ${sectionCode(ctx, busy.sectionId)}.`,
    }
  }
  return null
}

export function checkRoom(
  ctx: Context,
  room: Room,
  studentsCount: number,
  cell: Cell,
  ignoreLessonId?: string,
): Conflict | null {
  if (room.capacity < studentsCount) {
    return {
      code: 'ROOM_TOO_SMALL',
      short: `Мала: ${room.capacity} мест`,
      message: `В ${room.name} только ${room.capacity} мест, а студентов ${studentsCount}.`,
    }
  }
  const busy = lessonsAt(ctx, cell, ignoreLessonId).find((l) => l.roomId === room.id)
  if (busy) {
    return {
      code: 'ROOM_BUSY',
      short: `Занята: ${sectionCode(ctx, busy.sectionId)}`,
      message: `${room.name} в это время занята секцией ${sectionCode(ctx, busy.sectionId)}.`,
    }
  }
  return null
}

/** Подбирает лучшую свободную аудиторию: нужного типа и без лишних пустых мест. */
export function pickRoom(
  ctx: Context,
  section: Section,
  cell: Cell,
  ignoreLessonId?: string,
  preferredRoomId?: string | null,
): Room | null {
  const fits = (room: Room) => !checkRoom(ctx, room, section.studentsCount, cell, ignoreLessonId)

  const preferred = preferredRoomId ? ctx.catalog.rooms.get(preferredRoomId) : undefined
  if (preferred && fits(preferred)) return preferred

  const candidates = ctx.catalog.data.rooms.filter(fits)
  candidates.sort((a, b) => {
    const typeA = a.type === section.preferredRoomType ? 0 : 1
    const typeB = b.type === section.preferredRoomType ? 0 : 1
    return typeA - typeB || a.capacity - b.capacity
  })
  return candidates[0] ?? null
}

export interface Draft {
  sectionId: string
  teacherId: string | null
  roomId: string | null
  ignoreLessonId?: string
}

export function draftFromSource(source: PlacementSource, catalog: Catalog, lessons: Lesson[]): Draft | null {
  if (source.kind === 'section') {
    const section = catalog.sections.get(source.sectionId)
    if (!section) return null
    return { sectionId: section.id, teacherId: section.teacherId, roomId: null }
  }
  const lesson = lessons.find((l) => l.id === source.lessonId)
  if (!lesson) return null
  return {
    sectionId: lesson.sectionId,
    teacherId: lesson.teacherId,
    roomId: lesson.roomId,
    ignoreLessonId: source.copy ? undefined : lesson.id,
  }
}

/** Главная проверка: можно ли поставить занятие в ячейку и с какими параметрами. */
export function evaluatePlacement(ctx: Context, draft: Draft, cell: Cell): Evaluation {
  const section = ctx.catalog.sections.get(draft.sectionId)
  if (!section) return { ok: false, conflicts: [] }

  const conflicts: Conflict[] = []

  const sectionConflict = checkSection(ctx, section.id, cell, draft.ignoreLessonId)
  if (sectionConflict) return { ok: false, conflicts: [sectionConflict] }

  let teacherId: string | null = draft.teacherId
  let needsTeacher = false

  if (teacherId) {
    const teacherConflict = checkTeacher(ctx, teacherId, cell, draft.ignoreLessonId)
    if (teacherConflict) conflicts.push(teacherConflict)
  } else {
    const free = section.allowedTeacherIds.find((id) => !checkTeacher(ctx, id, cell, draft.ignoreLessonId))
    if (free) {
      teacherId = free
      needsTeacher = true
    } else {
      conflicts.push({
        code: 'NO_TEACHER',
        short: 'Нет преподавателя',
        message: 'Все преподаватели этой секции заняты или недоступны в это время.',
      })
    }
  }

  const room = pickRoom(ctx, section, cell, draft.ignoreLessonId, draft.roomId)
  if (!room) {
    conflicts.push({
      code: 'NO_ROOM',
      short: 'Нет аудитории',
      message: `Нет свободной аудитории на ${section.studentsCount} мест.`,
    })
  }

  if (conflicts.length > 0 || !room) return { ok: false, conflicts }

  return {
    ok: true,
    teacherId,
    roomId: room.id,
    roomChanged: Boolean(draft.roomId && draft.roomId !== room.id),
    needsTeacher,
  }
}
