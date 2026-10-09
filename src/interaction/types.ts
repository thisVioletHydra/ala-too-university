import type { WeekDay } from '#schedule/types.ts';

export type EditorRequest =
  | {
    mode: 'create'
    sectionId: string
    day: WeekDay
    timeSlotId: string
    teacherId: string | null
    roomId: string | null
    text: string | null
  }
  | { mode: 'edit', lessonId: string }
  | { mode: 'section', sectionId: string };

export type ActiveDrag =
  | { kind: 'section', sectionId: string, teacherId?: string, roomId?: string }
  | { kind: 'lesson', lessonId: string, copy: boolean };

export type DragFace = {
  code: string
  courseId: string
  courseCode: string
  teacherName: string | null
  roomName: string | null
};

export type Hand =
  | { kind: 'section', sectionId: string, teacherId?: string, roomId?: string, originLessonId?: string }
  | { kind: 'lesson', lessonId: string };

export type Hold = {
  hand: Hand | null
  aim: string
  overKey: string | null
  overList: boolean
};

export type DropTarget =
  | { kind: 'unassign' }
  | { kind: 'slot', day: WeekDay, timeSlotId: string };

export type Landing =
  | { kind: 'card', lessonId: string }
  | { kind: 'slot', day: WeekDay, timeSlotId: string }
  | { kind: 'tray' };

export type Flash = {
  lessonId: string | null
  sectionId: string | null
};

