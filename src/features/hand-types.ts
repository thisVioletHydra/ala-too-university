import type { Hand } from '#interaction/types.ts';
import type { Lesson, WeekDay } from '#schedule/types.ts';

export type Zone = 'list' | 'grid';

export type HandInput = {
  listHidden: boolean
  sections: { id: string }[]
  days: WeekDay[]
  slots: string[]
  lessons: Lesson[]
};

export type HandStep = {
  zone: Zone
  list: number
  day: number
  slot: number
  hand: Hand | null
  focus: boolean
};
