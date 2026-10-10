import type { useBoard } from '#app/providers.tsx';
import type { MutableRefObject } from 'react';
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

export type HandKeyContext = {
  event: KeyboardEvent
  input: HandInput
  board: ReturnType<typeof useBoard>
  hand: Hand | null
  zone: Zone
  list: number
  day: number
  slot: number
  keyboardRef: MutableRefObject<boolean>
  seekRef: MutableRefObject<boolean>
  publish: (next: HandStep) => void
};

