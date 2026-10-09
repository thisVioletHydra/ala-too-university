import type { Lesson, Section } from '#schedule/types.ts';

export function sectionTeacher(section: Section, lessons: Lesson[], remembered: Record<string, string>): string | null {
  return lessons.find((lesson) => lesson.sectionId === section.id)?.teacherId
    ?? remembered[section.id] ?? section.teacherId;
}
