import type { HandInput, HandStep, Zone } from '#features/hand-types.ts';

import { firstOpen, isHome } from '#features/hand-targets.ts';
import { handleHandKey } from '#features/hand-keyboard.ts';
import { slotKey, useBoard } from '#app/providers.tsx';
import { useAimFocus } from '#features/hand-focus.ts';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';

export function useHand(input: HandInput) {
  const board = useBoard();
  const [zone, setZone] = useState<Zone>('list');
  const [listIndex, setListIndex] = useState(0);
  const [cursor, setCursor] = useState({ day: 0, slot: 0 });
  const [armed, setArmed] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const keys = useRef(false);
  const seek = useRef(false);
  const leftList = useRef(false);
  const hand = board.hold.hand;

  const list = input.sections.length === 0 ? 0 : Math.min(listIndex, input.sections.length - 1);
  const day = input.days.length === 0 ? 0 : Math.min(cursor.day, input.days.length - 1);
  const slot = input.slots.length === 0 ? 0 : Math.min(cursor.slot, input.slots.length - 1);

  /** Секция без клавиатуры не должна сама ронять список в «область». */
  function keepOffList(next: Zone): boolean {
    return next === 'list' && hand?.kind === 'section' && !keys.current && !leftList.current;
  }

  /** Курсор уже стоит в этой клетке и уже вооружён — повторный переход не нужен. */
  function alreadyAimed(dayIndex: number, slotIndex: number): boolean {
    return zone === 'grid' && day === dayIndex && slot === slotIndex && armed;
  }

  function publish(next: HandStep): void {
    if (next.hand !== hand) leftList.current = false;

    const dayId = input.days[next.day];
    const slotId = input.slots[next.slot];
    const key = dayId && slotId ? slotKey(dayId, slotId) : '';
    const returning = next.hand !== null && next.zone === 'list';
    setZone(next.zone);
    setListIndex(next.list);
    setCursor({ day: next.day, slot: next.slot });
    setArmed(true);
    board.setHold({
      hand: next.hand,
      aim: returning ? 'list:return' : next.zone === 'list' ? `list:${next.list}` : key,
      overKey: next.hand && next.zone === 'grid' ? key : null,
      overList: returning,
    });
    if (next.focus) setFocusTick((tick) => tick + 1);
  }


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

  useAimFocus(focusTick);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    handleHandKey({ event, input, board, hand, zone, list, day, slot, keys, seek, publish });
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
        focus: true,
      });
    },
    enter: (next: Zone) => {
      if (keepOffList(next)) return;

      if (next === zone && armed) return;

      publish({ zone: next, list, day, slot, hand, focus: false });
    },
    pointGrid: (dayIndex: number, slotIndex: number) => {
      if (keys.current || !hand || board.ghost) return;

      if (zone === 'grid' && day === dayIndex && slot === slotIndex) return;

      publish({ zone: 'grid', list, day: dayIndex, slot: slotIndex, hand, focus: false });
    },
    focusGrid: (dayIndex: number, slotIndex: number) => {
      if (alreadyAimed(dayIndex, slotIndex)) return;

      keys.current = true;
      publish({ zone: 'grid', list, day: dayIndex, slot: slotIndex, hand, focus: false });
    },
    pointList: () => {
      if (keys.current || !hand || board.ghost) return;

      if (hand.kind === 'section' && !leftList.current) return;

      if (zone === 'list' && board.hold.overList) return;

      publish({ zone: 'list', list, day, slot, hand, focus: false });
    },
    leaveList: () => {
      if (hand && !board.ghost) leftList.current = true;
    },
    dropAt: (dayIndex: number, slotIndex: number) => {
      if (!hand || board.ghost) return;

      const dayId = input.days[dayIndex];
      const slotId = input.slots[slotIndex];
      if (!dayId || !slotId) return;

      if (hand.kind === 'lesson' && !board.repeat && isHome(input.lessons, hand.lessonId, dayId, slotId)) {
        publish({ zone: 'grid', list, day: dayIndex, slot: slotIndex, hand: null, focus: true });

        return;
      }

      board.dropHand(hand, { kind: 'slot', day: dayId, timeSlotId: slotId });
    },
  };
}
