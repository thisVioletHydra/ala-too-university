import type { ConflictResult, Lesson, ScheduleCatalog, Section } from './types.ts';

import { placementConflict } from './conflicts.ts';
import { sectionTeacher } from './section.teacher.ts';

type AssignmentInput = {
  catalog: ScheduleCatalog;
  lessons: Lesson[];
  rememberedTeachers: Record<string, string>;
  sectionId: string;
  teacherId?: string;
};

// Проверяем предложенное расписание целиком до сохранения изменений.
export function sectionAssignmentConflict(input: AssignmentInput): ConflictResult {
  const { catalog, lessons, sectionId, rememberedTeachers } = input;
  const section = catalog.sections.find((item) => item.id === sectionId);
  if (section === undefined)
    return {
      ok: false,
      kind: 'section-busy',
      text: 'Секция не найдена'
    };

  const courseId = section.courseId;
  const teacherId = input.teacherId ?? sectionTeacher(section, lessons, rememberedTeachers);
  const teacherAllowed = !teacherId || section.allowedTeacherIds.includes(teacherId);
  if (teacherAllowed === false)
    return {
      ok: false,
      kind: 'teacher-not-allowed',
      text: 'Преподаватель не ведёт эту секцию'
    };

  function alreadyAssigned(other: Section): boolean {
    const anotherSection = other.id !== sectionId;
    const sameCourse = other.courseId === courseId;
    const sameTeacher = sectionTeacher(other, lessons, rememberedTeachers) === teacherId;
    return anotherSection && sameCourse && sameTeacher;
  }

  const duplicate = teacherId ? catalog.sections.find(alreadyAssigned) : undefined;
  if (duplicate)
    return {
      ok: false,
      kind: 'teacher-not-allowed',
      text: `Преподаватель уже назначен на секцию ${duplicate.code} этой дисциплины`
    };

  const sectionLessons = lessons.filter((lesson) => lesson.sectionId === sectionId);
  for (const placement of sectionLessons) {
    const result = placementConflict({
      placement,
      lessons,
      sections: catalog.sections,
      rooms: catalog.rooms,
      blockedSlots: catalog.blockedSlots,
      excludeLessonId: placement.id,
    });
    if (!result.ok) return result;
  }

  return { ok: true };
}
