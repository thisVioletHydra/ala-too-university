import type { SlotAdvice } from '#schedule/conflicts.ts';
import type { Lesson, WeekDay } from '#schedule/types.ts';
import type { Hand } from '#app/providers.tsx';

import { keyboardGrid } from '#accessible/keyboard-grid.ts';
import { keyboardSlot } from '#accessible/keyboard-slot.ts';
import { slotKey, useBoard } from '#app/providers.tsx';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';

type Zone = 'list' | 'grid';

type HandInput = {
  sections: { id: string }[]
  days: WeekDay[]
  slots: string[]
  lessons: Lesson[]
};

type HandStep = {
  zone: Zone
  list: number
  day: number
  slot: number
  hand: Hand | null
  focus: boolean
  aim?: string
};

export function useHand(input: HandInput) {
  const board = useBoard();
  const [zone, setZone] = useState<Zone>('list');
  const [listIndex, setListIndex] = useState(0);
  const [cursor, setCursor] = useState({ day: 0, slot: 0 });
  const [armed, setArmed] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const keys = useRef(false);
  const seek = useRef(false);
  const hand = board.hold.hand;

  const list = input.sections.length === 0 ? 0 : Math.min(listIndex, input.sections.length - 1);
  const day = input.days.length === 0 ? 0 : Math.min(cursor.day, input.days.length - 1);
  const slot = input.slots.length === 0 ? 0 : Math.min(cursor.slot, input.slots.length - 1);

  function publish(next: HandStep): void {
    const dayId = input.days[next.day];
    const slotId = input.slots[next.slot];
    const key = dayId && slotId ? slotKey(dayId, slotId) : '';
    const returning = next.hand?.kind === 'lesson' && next.zone === 'list';
    setZone(next.zone);
    setListIndex(next.list);
    setCursor({ day: next.day, slot: next.slot });
    setArmed(true);
    board.setHold({
      hand: next.hand,
      aim: next.aim ?? (returning ? 'list:return' : next.zone === 'list' ? `list:${next.list}` : key),
      overKey: next.hand && next.zone === 'grid' ? key : null,
      overList: returning,
    });
    if (next.focus) setFocusTick((tick) => tick + 1);
  }

  useEffect(() => {
    if (focusTick === 0) return;

    const node = document.querySelector('[data-aim="yes"]');
    if (!(node instanceof HTMLElement)) return;

    node.focus();
    node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [focusTick]);

  useLayoutEffect(() => {
    if (!seek.current || hand === null || zone !== 'grid') return;

    seek.current = false;
    const fit = firstOpen(input.days, input.slots, input.lessons, board.advice) ?? { day, slot };
    publish({ zone: 'grid', list, day: fit.day, slot: fit.slot, hand, focus: true });
  }, [hand, zone, board.advice]);

  useEffect(() => {
    function onPointer(event: PointerEvent): void {
      if (!keys.current || !event.isPrimary) return;

      if (event.type === 'pointermove' && event.movementX === 0 && event.movementY === 0) return;

      keys.current = false;
    }

    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('pointermove', onPointer);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (typing(event.target)) return;

    const place = zoneOf(event.target);

    if (event.key === 'Tab') {
      const here = place ?? (hand ? zone : null);
      if (here === null || here === undefined) return;

      event.preventDefault();
      keys.current = true;
      const nextZone = here === 'list' ? 'grid' : 'list';
      const land = nextZone === 'grid' && hand !== null;
      if (land) seek.current = true;

      publish({
        zone: nextZone,
        list,
        day,
        slot,
        hand,
        focus: !land,
      });

      return;
    }

    if (event.key === 'Escape' && hand) {
      event.preventDefault();
      keys.current = true;
      publish({ zone, list, day, slot, hand: null, focus: true });

      return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && hand?.kind === 'lesson') {
      if (event.repeat) return;

      event.preventDefault();
      board.dropHand(hand, { kind: 'unassign' });

      return;
    }

    if (place === null || place === undefined) return;

    if (isArrow(event.key)) {
      event.preventDefault();
      keys.current = true;
      if (place === 'list') {
        publish({
          zone: 'list',
          list: keyboardSlot(list, event.key, input.sections.length),
          day,
          slot,
          hand,
          focus: true,
        });

        return;
      }

      const next = keyboardGrid({ day, slot }, event.key, input.days.length, input.slots.length);
      publish({ zone: 'grid', list, day: next.day, slot: next.slot, hand, focus: true });

      return;
    }

    if (event.key === 'Enter' && !hand && place === 'grid') {
      const lesson = lessonAt(input.lessons, input.days, input.slots, day, slot, event.target);
      if (lesson === null || lesson === undefined) return;

      event.preventDefault();
      board.setEditor({ mode: 'edit', lessonId: lesson.id });

      return;
    }

    if (event.key !== ' ' && event.key !== 'Spacebar') return;

    if (event.repeat) return;

    event.preventDefault();
    keys.current = true;

    if (place === 'list') {
      if (hand === null || hand === undefined) {
        const section = input.sections[list];
        if (section === null || section === undefined) return;

        seek.current = true;
        publish({
          zone: 'grid',
          list,
          day,
          slot,
          hand: { kind: 'section', sectionId: section.id },
          focus: false,
        });

        return;
      }

      if (hand.kind === 'lesson') {
        board.dropHand(hand, { kind: 'unassign' });

        return;
      }

      publish({ zone: 'list', list, day, slot, hand: null, focus: true });

      return;
    }

    if (hand === null || hand === undefined) {
      const lesson = lessonAt(input.lessons, input.days, input.slots, day, slot, event.target);
      if (lesson === null || lesson === undefined) return;

      // Курсор переезжает в клетку взятой карточки, иначе пунктир цели остаётся
      // там, где он был до этого, и не совпадает с тем, что мы держим в руке.
      const from = lessonSlot(lesson, input.days, input.slots) ?? { day, slot };

      publish({
        zone: 'grid',
        list,
        day: from.day,
        slot: from.slot,
        hand: { kind: 'lesson', lessonId: lesson.id },
        focus: true,
      });

      return;
    }

    const dayId = input.days[day];
    const slotId = input.slots[slot];
    if (!dayId || !slotId) return;

    if (hand.kind === 'lesson' && isHome(input.lessons, hand.lessonId, dayId, slotId)) {
      publish({ zone: 'grid', list, day, slot, hand: null, focus: true });

      return;
    }

    board.dropHand(hand, { kind: 'slot', day: dayId, timeSlotId: slotId });
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return {
    listIndex: list,
    dayIndex: day,
    slotIndex: slot,
    grabSection: (sectionId: string, index: number) => {
      publish({
        zone: 'grid',
        list: index,
        day,
        slot,
        hand: { kind: 'section', sectionId },
        focus: true,
      });
    },
    grabLesson: (lessonId: string, dayIndex: number, slotIndex: number) => {
      publish({
        zone: 'grid',
        list,
        day: dayIndex,
        slot: slotIndex,
        hand: { kind: 'lesson', lessonId },
        // Pointer click picks up the card, but does not move the keyboard
        // target until the pointer actually enters another slot.
        focus: false,
        aim: '',
      });
    },
    enter: (next: Zone) => {
      if (next === zone && armed) return;

      publish({ zone: next, list, day, slot, hand, focus: false });
    },
    pointGrid: (dayIndex: number, slotIndex: number) => {
      if (keys.current || !hand || board.ghost) return;

      if (zone === 'grid' && day === dayIndex && slot === slotIndex) return;

      publish({ zone: 'grid', list, day: dayIndex, slot: slotIndex, hand, focus: false });
    },
    pointList: () => {
      if (keys.current || hand?.kind !== 'lesson' || board.ghost) return;

      if (zone === 'list' && board.hold.overList) return;

      publish({ zone: 'list', list, day, slot, hand, focus: false });
    },
    dropAt: (dayIndex: number, slotIndex: number) => {
      if (!hand || board.ghost) return;

      const dayId = input.days[dayIndex];
      const slotId = input.slots[slotIndex];
      if (!dayId || !slotId) return;

      if (hand.kind === 'lesson' && isHome(input.lessons, hand.lessonId, dayId, slotId)) {
        publish({ zone: 'grid', list, day: dayIndex, slot: slotIndex, hand: null, focus: true });

        return;
      }

      board.dropHand(hand, { kind: 'slot', day: dayId, timeSlotId: slotId });
    },
  };
}

function firstOpen(
  days: WeekDay[],
  slots: string[],
  lessons: Lesson[],
  advice: Map<string, SlotAdvice>,
): { day: number, slot: number } | null {
  let fallback: { day: number, slot: number } | null = null;
  for (let slot = 0; slot < slots.length; slot++) {
    for (let day = 0; day < days.length; day++) {
      const dayId = days[day];
      const slotId = slots[slot];
      if (!dayId || !slotId) continue;

      const item = advice.get(slotKey(dayId, slotId));
      if (!item?.ok) continue;

      const occupied = lessons.some((lesson) => lesson.day === dayId && lesson.timeSlotId === slotId);
      if (occupied === null || occupied === undefined) return { day, slot };

      if (fallback === null || fallback === undefined) fallback = { day, slot };
    }
  }

  return fallback;
}

function isHome(lessons: Lesson[], lessonId: string, dayId: WeekDay, slotId: string): boolean {
  const lesson = lessons.find((item) => item.id === lessonId);
  return lesson?.day === dayId && lesson.timeSlotId === slotId;
}

function lessonAt(
  lessons: Lesson[],
  days: WeekDay[],
  slots: string[],
  day: number,
  slot: number,
  target: EventTarget | null,
): Lesson | null {
  if (target instanceof Element) {
    const id = target.closest('[data-lesson-id]')?.getAttribute('data-lesson-id');
    if (id) return lessons.find((item) => item.id === id) ?? null;
  }

  const dayId = days[day];
  const slotId = slots[slot];
  if (!dayId || !slotId) return null;

  return lessons.find((item) => item.day === dayId && item.timeSlotId === slotId) ?? null;
}

function lessonSlot(
  lesson: Lesson,
  days: WeekDay[],
  slots: string[],
): { day: number, slot: number } | null {
  const day = days.indexOf(lesson.day);
  const slot = slots.indexOf(lesson.timeSlotId);
  if (day < 0 || slot < 0) return null;

  return { day, slot };
}

function zoneOf(target: EventTarget | null): Zone | null {
  if (!(target instanceof Element)) return null;

  if (target.closest('[data-keyboard-zone="grid"]')) return 'grid';

  if (target.closest('[data-keyboard-zone="list"]')) return 'list';

  return null;
}

function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (target.closest('[role="dialog"]')) return true;

  const tag = target.tagName;

  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function isArrow(key: string): boolean {
  return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight';
}
