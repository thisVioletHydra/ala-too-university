import type { Course, Lesson, Room, ScheduleCatalog, Section, Teacher } from '#schedule/types.ts';
import type { LessonCardProps } from '#ui/lesson-card/lesson-card.tsx';

import { TEACHER_PLACEHOLDER } from '#ui/teacher-label.ts';

type LessonCardsInput = {
  catalog: ScheduleCatalog;
  lessons: Lesson[];
  teacherId: string | null;
  roomId: string | null;
  dayIndex: number;
  slotIndex: number;
  onGrab: (lessonId: string, dayIndex: number, slotIndex: number) => void;
  onDrop: (dayIndex: number, slotIndex: number) => void;
};

export function lessonCards({ catalog, lessons, teacherId, roomId, dayIndex, slotIndex, onGrab, onDrop }: LessonCardsInput): LessonCardProps[] {
  return lessons.map((lesson) => {
    const section = findSection(catalog, lesson.sectionId);
    const teacher = findTeacher(catalog, lesson.teacherId);
    const room = findRoom(catalog, lesson.roomId);
    if (!section || !room) return null;

    return {
      lessonId: lesson.id,
      sectionId: section.id,
      courseId: section.courseId,
      courseCode: findCourse(catalog, section.courseId)?.code ?? section.code,
      courseName: findCourse(catalog, section.courseId)?.name ?? section.code,
      code: section.code,
      teacherName: teacher?.shortName ?? TEACHER_PLACEHOLDER,
      roomName: room.name,
      roomType: room.type,
      preferredRoomType: section.preferredRoomType,
      highlighted: false,
      dimmed: (teacherId !== null || roomId !== null) && !highlighted(lesson, teacherId, roomId),
      onGrab: () => onGrab(lesson.id, dayIndex, slotIndex),
      onDrop: () => onDrop(dayIndex, slotIndex),
    };
  }).filter((item) => item !== null);
}

function highlighted(lesson: Lesson, teacherId: string | null, roomId: string | null): boolean {
  if (!teacherId && !roomId) return false;

  if (teacherId && lesson.teacherId !== teacherId) return false;

  if (roomId && lesson.roomId !== roomId) return false;

  return true;
}

function findCourse(catalog: ScheduleCatalog, id: string): Course | undefined {
  return catalog.courses.find((item) => item.id === id);
}

function findSection(catalog: ScheduleCatalog, id: string): Section | undefined {
  return catalog.sections.find((item) => item.id === id);
}

function findTeacher(catalog: ScheduleCatalog, id: string): Teacher | undefined {
  return catalog.teachers.find((item) => item.id === id);
}

function findRoom(catalog: ScheduleCatalog, id: string): Room | undefined {
  return catalog.rooms.find((item) => item.id === id);
}
