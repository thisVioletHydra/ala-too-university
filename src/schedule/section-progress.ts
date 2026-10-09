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

function progressState(placed: number, required: number): ProgressState {
  if (placed <= 0) return 'empty';

  if (placed >= required) return 'done';

  return 'partial';
}
