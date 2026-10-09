import type { Section } from '#schedule/types.ts';

export type Grouping = 'course' | 'teacher';
export type SectionRow = {
  section: Section;
  index: number;
  first: boolean;
  last: boolean;
  heading: { title: string; detail: string; code: string | null } | null;
};

type GroupInput = {
  sections: Section[];
  groupBy: Grouping;
  teacherName: (section: Section) => string | null;
  courseName: (section: Section) => string;
  courseCode: (section: Section) => string;
};

// Builds display metadata once. Rendering does not decide group boundaries.
export function sectionRows(input: GroupInput): SectionRow[] {
  function groupKey(section: Section): string {
    return input.groupBy === 'course' ? section.courseId : input.teacherName(section) ?? 'unassigned';
  }
  const teacherCounts = new Map<string, Set<string>>();
  for (const section of input.sections) {
    const names = teacherCounts.get(section.courseId) ?? new Set<string>();
    const teacher = input.teacherName(section);
    if (teacher) names.add(teacher);
    teacherCounts.set(section.courseId, names);
  }
  return input.sections.map((section, index) => {
    const previous = input.sections[index - 1];
    const next = input.sections[index + 1];
    const key = groupKey(section);
    const first = !previous || groupKey(previous) !== key;
    const last = !next || groupKey(next) !== key;
    const heading = input.groupBy === 'course'
      ? { title: input.courseName(section), detail: `Преподавателей: ${teacherCounts.get(section.courseId)?.size ?? 0}`, code: input.courseCode(section) }
      : { title: input.teacherName(section) ?? 'Нужен преподаватель', detail: 'Дисциплины преподавателя', code: null };
    return { section, index, first, last, heading: first ? heading : null };
  });
}
