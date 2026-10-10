export type WeekDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';

export type RoomType = 'LECTURE' | 'COMPUTER_LAB';

export type TimeSlot = {
  id: string
  start: string
  end: string
};

export type Course = {
  id: string
  code: string
  name: string
};

export type Teacher = {
  id: string
  name: string
  shortName: string
};

export type Room = {
  id: string
  name: string
  capacity: number
  type: RoomType
};

export type Section = {
  id: string
  courseId: string
  code: string
  studentsCount: number
  requiredLessonsPerWeek: number
  teacherId: string | null
  allowedTeacherIds: string[]
  preferredRoomType: RoomType
};

export type TeacherBlockedSlot = {
  teacherId: string
  day: WeekDay
  timeSlotId: string
  reason: string
};

export type Lesson = {
  id: string
  sectionId: string
  teacherId: string
  roomId: string
  day: WeekDay
  timeSlotId: string
};

export type WeekDayMeta = {
  id: WeekDay
  label: string
};

export type ScheduleMeta = {
  title: string
  version: number
  weekDays: WeekDayMeta[]
};

export type ScheduleCatalog = {
  meta: ScheduleMeta
  weekDays: WeekDayMeta[]
  timeSlots: TimeSlot[]
  courses: Course[]
  teachers: Teacher[]
  rooms: Room[]
  sections: Section[]
  blockedSlots: TeacherBlockedSlot[]
  lessons: Lesson[]
};

export type Placement = {
  sectionId: string
  teacherId: string
  roomId: string
  day: WeekDay
  timeSlotId: string
};

export type LessonEdit = {
  lessonId: string
  teacherId: string
  roomId: string
};

export type LessonMove = {
  lessonId: string
  day: WeekDay
  timeSlotId: string
};

type ConflictKind =
  | 'section-busy'
  | 'teacher-blocked'
  | 'teacher-busy'
  | 'room-small'
  | 'room-busy'
  | 'no-room'
  | 'teacher-not-allowed';

export type ConflictResult =
  | { ok: true }
  | { ok: false, kind: ConflictKind, text: string };
