import type { Hand, ActiveDrag } from '#interaction/types.ts';
import type { LessonCardProps } from '#ui/lesson-card/lesson-card.tsx';

import { groupView } from '#interaction/group.policy.ts';

export type SlotLessonsView = {
  multiple: boolean
  strips: boolean
  visible: LessonCardProps[]
  sourceIndex: number
  reordering: boolean
  insertion: number
  ordered: LessonCardProps[]
};

type ViewInput = {
  items: LessonCardProps[]
  carried: ActiveDrag | Hand | null
  repeat: boolean
  position: number | null
};

/** Раскладка занятий в одной клетке: одна карточка, пара или полоски. */
export function slotLessonsView(input: ViewInput): SlotLessonsView {
  const view = groupView(input.items.length);
  const multiple = view !== 'single';
  const visible = multiple ? input.items.slice(0, 2) : input.items;
  const carriedLessonId = input.carried?.kind === 'lesson' ? input.carried.lessonId : null;
  const sourceIndex = carriedLessonId === null
    ? -1
    : input.items.findIndex((item) => item.lessonId === carriedLessonId);
  const reordering = input.items.length === 2 && sourceIndex >= 0 && input.repeat === false;
  const insertion = input.position ?? Math.max(0, sourceIndex);
  const ordered = reordering && insertion !== sourceIndex ? [...visible].reverse() : visible;

  return { multiple, strips: view === 'strips', visible, sourceIndex, reordering, insertion, ordered };
}
