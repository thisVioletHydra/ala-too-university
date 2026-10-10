import type { LessonCardProps } from '#ui/lesson-card/lesson-card.tsx';
import type { Dispatch, RefObject, SetStateAction } from 'react';

import { groupCommand } from '#interaction/group-policy.ts';
import { lessonNode, slotOf } from '#ui/schedule-grid/slotLessons.selectors.ts';
import { matchesAnyKey, matchesKey } from '#accessible/keyboard.bindings.ts';
import { useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { useEffect } from 'react';

const CARD_ACTIONS = ['previous', 'next', 'edit', 'place', 'cancel', 'remove'] as const;

type SlotCommandsInput = {
  items: LessonCardProps[]
  multiple: boolean
  strips: boolean
  insertion: number
  root: RefObject<HTMLDivElement | null>
  setPosition: Dispatch<SetStateAction<number | null>>
  show: () => void
};

/** Клавиши и клики по клетке: выбор занятия, порядок в паре и раскрытие полосок. */
export function useSlotCommands(input: SlotCommandsInput): void {
  const board = useBoard();
  const { items, multiple, strips, insertion, root, setPosition, show } = input;

  useEffect(() => {
    const slot = slotOf(root.current);

    function cannotOpenStrips(): boolean {
      return !strips || board.hold.hand !== null || board.ghost !== null || board.skipClick();
    }

    function choose(event: Event): void {
      if (!(event instanceof KeyboardEvent)) return;

      if (!multiple || board.ghost || board.editor) return;

      const card = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-lesson-id]') : null;
      const held = board.hold.hand;
      const cellTarget = event.target === slot || Boolean(event.target instanceof Element && event.target.closest('[data-slot-strip]'));
      const command = groupCommand({
        lessonIds: items.map((item) => item.lessonId),
        hand: held,
        dragging: board.ghost !== null,
        copyMode: event.shiftKey,
        key: event.key,
        cellTarget,
      });

      if (held) {
        if (command === 'ignore') return;

        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;

        if (command === 'confirm-order' && held.kind === 'lesson') {
          useSchedule.getState().swapLessons(held.lessonId, items[insertion].lessonId);
          board.setHold({ ...board.hold, hand: null, overKey: null, overList: false });
          slot?.focus();
        } else {
          const direction = command === 'reorder-down' ? 1 : -1;
          setPosition(Math.max(0, Math.min(items.length - 1, insertion + direction)));
        }

        return;
      }

      if (strips === false && card) {
        if (matchesAnyKey(CARD_ACTIONS, event.key) === null || matchesAnyKey(CARD_ACTIONS, event.key) === undefined) return;

        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;

        const index = items.findIndex((item) => item.lessonId === card.dataset.lessonId);
        if (index < 0) return;

        if (matchesKey('remove', event.key)) {
          useSchedule.getState().unassignLesson(items[index].lessonId);
          slot?.focus();
        }

        if (matchesKey('cancel', event.key)) slot?.focus();

        if (matchesKey('previous', event.key) || matchesKey('next', event.key)) {
          const next = items[(index + (matchesKey('next', event.key) ? 1 : -1) + items.length) % items.length];
          lessonNode(root.current, next.lessonId)?.focus();
        }

        if (matchesKey('edit', event.key)) board.setEditor({ mode: 'edit', lessonId: items[index].lessonId });

        if (matchesKey('place', event.key)) items[index].onGrab();

        return;
      }

      if (command === 'ignore') return;

      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;

      if (command === 'open-picker') show();
      else lessonNode(root.current, items[0].lessonId)?.focus();
    }

    function openStrips(event: Event): void {
      if (cannotOpenStrips()) return;

      event.preventDefault();
      event.stopPropagation();
      show();
    }

    slot?.addEventListener('keydown', choose);
    slot?.addEventListener('click', openStrips);

    return () => {
      slot?.removeEventListener('keydown', choose);
      slot?.removeEventListener('click', openStrips);
    };
  }, [multiple, strips, items, board, insertion, root, setPosition, show]);
}
