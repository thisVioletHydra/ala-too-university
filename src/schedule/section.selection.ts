import type { Lesson, Section } from './types.ts';
import type { SectionProgress } from './section.progress.ts';

import { sectionProgress } from './section.progress.ts';
import { sectionTeacher } from './section.teacher.ts';

export type ListMode = 'all' | 'not-done' | 'done' | 'no-teacher' | 'excess';
type SelectionInput = {
  sections: Section[];
  lessons: Lesson[];
  remembered: Record<string, string>;
  mode: ListMode;
  groupBy: 'course' | 'teacher';
  teacherId: string;
};
type SectionEntry = {
  section: Section;
  progress: SectionProgress;
  teacherId: string | null;
};

export function selectSections(input: SelectionInput): { visible: Section[]; counts: Record<ListMode, number> } {
  const { sections, lessons, remembered, groupBy, mode, teacherId } = input;
  const counts: Record<ListMode, number> = { all: sections.length, done: 0, 'not-done': 0, 'no-teacher': 0, excess: 0 };
  const courseOrder = new Map<string, number>();
  const lessonsBySection = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const group = lessonsBySection.get(lesson.sectionId) ?? [];
    group.push(lesson);
    lessonsBySection.set(lesson.sectionId, group);
  }

  const entries = sections.map((section): SectionEntry => {
    if (!courseOrder.has(section.courseId)) courseOrder.set(section.courseId, courseOrder.size);

    const sectionLessons = lessonsBySection.get(section.id) ?? [];
    const progress = sectionProgress(section, sectionLessons);
    const assignedTeacher = sectionTeacher(section, sectionLessons, remembered);
    counts[progress.state === 'done' ? 'done' : 'not-done']++;
    if (assignedTeacher === null || assignedTeacher === '') counts['no-teacher']++;

    if (progress.placed > progress.required) counts.excess++;

    return { section, progress, teacherId: assignedTeacher };
  });
  const matchesStatus: Record<ListMode, (entry: SectionEntry) => boolean> = {
    all: () => true,
    'not-done': (entry) => entry.progress.state !== 'done',
    done: (entry) => entry.progress.state === 'done',
    'no-teacher': (entry) => !entry.teacherId,
    excess: (entry) => entry.progress.placed > entry.progress.required,
  };
  const filterTeacher = groupBy === 'teacher' && teacherId !== '';
  function matchesFilters(entry: SectionEntry): boolean {
    const matchesTeacher = !filterTeacher || entry.teacherId === teacherId;
    return matchesTeacher && matchesStatus[mode](entry);
  }

  function compareEntries(first: SectionEntry, second: SectionEntry): number {
    const courseDifference = (courseOrder.get(first.section.courseId) ?? 0) - (courseOrder.get(second.section.courseId) ?? 0);
    if (groupBy === 'course') return courseDifference;

    const teacherDifference = (first.teacherId ?? '').localeCompare(second.teacherId ?? '');

    return teacherDifference || courseDifference;
  }

  const visible = entries.filter(matchesFilters).sort(compareEntries).map((entry) => entry.section);
  return { visible, counts };
}
