import type { Lesson, Section } from '#schedule/types.ts';

export type ProgressState = 'empty' | 'partial' | 'done';

export type SectionProgress = {
  placed: number
  required: number
  state: ProgressState
};

export function sectionProgress(section: Section, lessons: Lesson[]): SectionProgress {
  const placed = lessons.filter((lesson) => lesson.sectionId === section.id).length;
  const required = section.requiredLessonsPerWeek;
  const state = progressState(placed, required);
  return { placed, required, state };
}

export function scheduleProgress(sections: Section[], lessons: Lesson[]) {
  const progress = sections.map((section) => sectionProgress(section, lessons));
  const required = progress.reduce((sum, item) => sum + item.required, 0);
  const placed = progress.reduce((sum, item) => sum + Math.min(item.placed, item.required), 0);
  const done = progress.filter((item) => item.state === 'done').length;
  return { required, placed, remaining: required - placed, sections: { all: sections.length, done, 'not-done': sections.length - done } };
}

function progressState(placed: number, required: number): ProgressState {
  if (placed <= 0) return 'empty';

  if (placed >= required) return 'done';

  return 'partial';
}
