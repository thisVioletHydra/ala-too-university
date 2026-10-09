import type { Lesson, Section } from './types.ts';

import { sectionProgress, scheduleProgress } from './section-progress.ts';
import { sectionTeacher } from './section-teacher.ts';

export type ListMode = 'all' | 'not-done' | 'done' | 'no-teacher' | 'excess';
type SelectionInput = {
  sections: Section[];
  lessons: Lesson[];
  remembered: Record<string, string>;
  mode: ListMode;
  groupBy: 'course' | 'teacher';
  teacherId: string;
};

export function selectSections(input: SelectionInput): { visible: Section[]; counts: Record<ListMode, number> } {
  const { sections, lessons, remembered } = input;
  const progress = new Map(sections.map((section) => [section.id, sectionProgress(section, lessons)]));
  function needsTeacher(section: Section): boolean {
    return !sectionTeacher(section, lessons, remembered);
  }

  function hasExtraLessons(section: Section): boolean {
    return progress.get(section.id)!.placed > section.requiredLessonsPerWeek;
  }

  const matchesStatus: Record<ListMode, (section: Section) => boolean> = {
    all: () => true,
    'not-done': (section) => progress.get(section.id)!.state !== 'done',
    done: (section) => progress.get(section.id)!.state === 'done',
    'no-teacher': needsTeacher,
    excess: hasExtraLessons,
  };
  const filterTeacher = input.groupBy === 'teacher' && input.teacherId !== '';
  function matchesTeacher(section: Section): boolean {
    return !filterTeacher || sectionTeacher(section, lessons, remembered) === input.teacherId;
  }

  const courseOrder = new Map([...new Set(sections.map((section) => section.courseId))].map((id, index) => [id, index]));
  function compareCourses(a: Section, b: Section): number {
    return (courseOrder.get(a.courseId) ?? 0) - (courseOrder.get(b.courseId) ?? 0);
  }

  function compareTeachers(a: Section, b: Section): number {
    const first = sectionTeacher(a, lessons, remembered) ?? '';
    const second = sectionTeacher(b, lessons, remembered) ?? '';
    return first.localeCompare(second) || compareCourses(a, b);
  }

  const visible = sections.filter(matchesTeacher).filter(matchesStatus[input.mode]);
  visible.sort(input.groupBy === 'teacher' ? compareTeachers : compareCourses);
  return {
    visible,
    counts: {
      ...scheduleProgress(sections, lessons).sections,
      excess: sections.filter(hasExtraLessons).length,
      'no-teacher': sections.filter(needsTeacher).length,
    },
  };
}
