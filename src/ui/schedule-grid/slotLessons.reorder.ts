import type { Hand, ActiveDrag } from '#interaction/types.ts';
import type { LessonCardProps } from '#ui/lesson-card/lesson-card.tsx';
import type { Dispatch, RefObject, SetStateAction } from 'react';

import { slotOf } from '#ui/schedule-grid/slotLessons.selectors.ts';
import { useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { useEffect, useLayoutEffect } from 'react';

type PairReorderInput = {
  items: LessonCardProps[]
  insertion: number
  reordering: boolean
  carried: ActiveDrag | Hand | null
  root: RefObject<HTMLDivElement | null>
  setPosition: Dispatch<SetStateAction<number | null>>
};

/** Перестановка пары: предпросмотр по половине клетки и подтверждение кликом. */
export function usePairReorder({ items, insertion, reordering, carried, root, setPosition }: PairReorderInput): void {
  const board = useBoard();
  const carriedLessonId = carried?.kind === 'lesson' ? carried.lessonId : null;

  useEffect(() => {
    setPosition(null);
  }, [carriedLessonId]);

  useLayoutEffect(() => {
    const slot = slotOf(root.current);
    if (slot === null) return;

    if (reordering) slot.dataset.reorderTarget = items[insertion].lessonId;
    else delete slot.dataset.reorderTarget;

    return () => {
      delete slot.dataset.reorderTarget;
    };
  }, [reordering, insertion, items, root]);

  useEffect(() => {
    if (reordering === false) return;

    const slot = slotOf(root.current);

    function point(event: PointerEvent): void {
      if (event.target instanceof Element && event.target.closest('[data-action]')) return;

      if (!slot || root.current === null) return;

      if (event.movementX === 0 && event.movementY === 0) return;

      const rect = root.current.getBoundingClientRect();
      setPosition(event.clientY < rect.top + rect.height / 2 ? 0 : 1);
    }

    function confirm(event: MouseEvent): void {
      if (event.target instanceof Element && event.target.closest('[data-action]')) return;

      if (board.ghost !== null || board.skipClick()) return;

      const moved = carried?.kind === 'lesson' ? carried : null;
      if (moved === null) return;

      event.preventDefault();
      event.stopPropagation();
      useSchedule.getState().swapLessons(moved.lessonId, items[insertion].lessonId);
      board.setHold({ ...board.hold, hand: null, overKey: null, overList: false });
      slot?.focus();
    }

    slot?.addEventListener('pointermove', point);
    slot?.addEventListener('click', confirm, true);

    return () => {
      slot?.removeEventListener('pointermove', point);
      slot?.removeEventListener('click', confirm, true);
    };
  }, [reordering, carried, insertion, items, board, root, setPosition]);
}
