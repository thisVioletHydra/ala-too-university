import type { HandInput, HandStep, Zone } from '#features/hand.types.ts';

import { firstAvailableSlot, isOriginalSlot } from '#features/hand.targets.ts';
import { handleHandKey } from '#features/hand.keyboard.ts';
import { slotKey, useBoard } from '#app/providers.tsx';
import { subscribeInputMethod } from '#accessible/input.method.ts';
import { useAimFocus } from '#accessible/focus.aim.ts';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';

export function useHand(input: HandInput) {
  const board = useBoard();
  const [zone, setZone] = useState<Zone>('list');
  const [listIndex, setListIndex] = useState(0);
  const [cursor, setCursor] = useState({ day: 0, slot: 0 });
  const [armed, setArmed] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const keyboardRef = useRef(false);
  const seekRef = useRef(false);
  const leftListRef = useRef(false);
  const hand = board.hold.hand;

  const list = input.sections.length === 0 ? 0 : Math.min(listIndex, input.sections.length - 1);
  const day = input.days.length === 0 ? 0 : Math.min(cursor.day, input.days.length - 1);
  const slot = input.slots.length === 0 ? 0 : Math.min(cursor.slot, input.slots.length - 1);

  /** Секция без клавиатуры не должна сама ронять список в «область». */
  function keepOffList(next: Zone): boolean {
    return next === 'list' && hand?.kind === 'section' && !keyboardRef.current && !leftListRef.current;
  }

  /** Курсор уже стоит в этой клетке и уже вооружён — повторный переход не нужен. */
  function alreadyAimed(dayIndex: number, slotIndex: number): boolean {
    return zone === 'grid' && day === dayIndex && slot === slotIndex && armed;
  }

  function publish(next: HandStep): void {
    if (next.hand !== hand) leftListRef.current = false;

    const dayId = input.days[next.day];
    const slotId = input.slots[next.slot];
    const key = dayId && slotId ? slotKey(dayId, slotId) : '';
    const returning = next.hand !== null && next.zone === 'list';
    let aim = key;
    if (next.zone === 'list') aim = returning ? 'list:return' : `list:${next.list}`;

    setZone(next.zone);
    setListIndex(next.list);
    setCursor({ day: next.day, slot: next.slot });
    setArmed(true);
    board.setHold({
      hand: next.hand,
      aim,
      overKey: next.hand && next.zone === 'grid' ? key : null,
      overList: returning,
    });
    if (next.focus) setFocusTick((tick) => tick + 1);
  }

  const seekOpenSlot = useEffectEvent(() => {
    if (!seekRef.current || hand === null || zone !== 'grid') return;

    seekRef.current = false;
    const fit = firstAvailableSlot(input.days, input.slots, input.lessons, board.advice) ?? { day, slot };
    publish({ zone: 'grid', list, day: fit.day, slot: fit.slot, hand, focus: true });
  });

  useLayoutEffect(() => {
    seekOpenSlot();
  }, [hand, zone, board.advice]);

  useEffect(() => {
    return subscribeInputMethod((method) => {
      if (method === 'pointer') keyboardRef.current = false;
    });
  }, []);

  useAimFocus(focusTick);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    handleHandKey({ event, input, board, hand, zone, list, day, slot, keyboardRef, seekRef, publish });
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function grabSection(sectionId: string, index: number): void {
    publish({
      zone: 'grid',
      list: index,
      day,
      slot,
      hand: { kind: 'section', sectionId },
      focus: true,
    });
  }

  function grabLesson(lessonId: string, dayIndex: number, slotIndex: number): void {
    publish({
      zone: 'grid',
      list,
      day: dayIndex,
      slot: slotIndex,
      hand: { kind: 'lesson', lessonId },
      focus: true,
    });
  }

  function enter(next: Zone): void {
    if (keepOffList(next)) return;

    if (next === zone && armed) return;

    publish({ zone: next, list, day, slot, hand, focus: false });
  }

  function pointGrid(dayIndex: number, slotIndex: number): void {
    if (keyboardRef.current || !hand || board.ghost) return;

    if (zone === 'grid' && day === dayIndex && slot === slotIndex) return;

    publish({ zone: 'grid', list, day: dayIndex, slot: slotIndex, hand, focus: false });
  }

  function focusGrid(dayIndex: number, slotIndex: number): void {
    if (alreadyAimed(dayIndex, slotIndex)) return;

    keyboardRef.current = true;
    publish({ zone: 'grid', list, day: dayIndex, slot: slotIndex, hand, focus: false });
  }

  function pointList(): void {
    if (keyboardRef.current || !hand || board.ghost) return;

    if (hand.kind === 'section' && !leftListRef.current) return;

    if (zone === 'list' && board.hold.overList) return;

    publish({ zone: 'list', list, day, slot, hand, focus: false });
  }

  function leaveList(): void {
    if (hand && !board.ghost) leftListRef.current = true;
  }

  function dropAt(dayIndex: number, slotIndex: number): void {
    if (!hand || board.ghost) return;

    const dayId = input.days[dayIndex];
    const slotId = input.slots[slotIndex];
    if (!dayId || !slotId) return;

    if (hand.kind === 'lesson' && !board.repeat && isOriginalSlot(input.lessons, hand.lessonId, dayId, slotId)) {
      publish({ zone: 'grid', list, day: dayIndex, slot: slotIndex, hand: null, focus: true });

      return;
    }

    board.dropHand(hand, { kind: 'slot', day: dayId, timeSlotId: slotId });
  }
  return {
    listIndex: list,
    dayIndex: day,
    slotIndex: slot,
    grabSection,
    grabLesson,
    enter,
    pointGrid,
    focusGrid,
    pointList,
    leaveList,
    dropAt,
  };
}
