import type { PickerReturn } from '#interaction/picker.return.ts';
import type { LessonCardProps } from '#ui/lesson-card/lesson-card.tsx';
import type { RefObject } from 'react';

import { restoreFocus } from '#accessible/focus.dialog.ts';
import { pickerReturnAfter, pickerReturnLesson } from '#interaction/picker.return.ts';
import { pickerState } from '#interaction/group.policy.ts';
import { lessonNode, LESSON_SELECTOR, PICKER_CLOSE_SELECTOR, slotOf } from '#ui/schedule-grid/slotLessons.selectors.ts';
import { subscribeCancelHand } from '#ui/hand-events.ts';
import { matchesKey } from '#accessible/keyboard.bindings.ts';
import { useBoard } from '#app/providers.tsx';
import { useEffect, useRef, useState } from 'react';

export type SlotPickerState = {
  open: boolean
  dialog: RefObject<HTMLDialogElement | null>
  selected: RefObject<string | null>
  returnToPicker: RefObject<PickerReturn>
  show: () => void
  close: (restore?: boolean) => void
};

type SlotPickerInput = {
  items: LessonCardProps[]
  root: RefObject<HTMLDivElement | null>
};

/** Жизненный цикл нативного <dialog>: открытие, фокус, закрытие и возврат после отмены. */
export function useSlotPicker({ items, root }: SlotPickerInput): SlotPickerState {
  const board = useBoard();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const selected = useRef<string | null>(null);
  const returnToPicker = useRef<PickerReturn>({ kind: 'none' });
  if (open && board.ghost !== null) setOpen(false);

  function show(): void {
    if (board.hold.hand || board.ghost) return;

    origin.current = slotOf(root.current);
    setOpen(true);
  }

  function close(restore = true): void {
    dialog.current?.close();
    setOpen(false);
    if (restore) restoreFocus(origin.current, null);
  }

  useEffect(() => {
    function restorePicker(): void {
      const lessonId = pickerReturnLesson(returnToPicker.current, items.map((item) => item.lessonId));
      if (lessonId === null || lessonId === undefined) return;

      returnToPicker.current = pickerReturnAfter({ kind: 'release' });
      selected.current = lessonId;
      setOpen(true);
    }

    return subscribeCancelHand(restorePicker);
  }, [items]);

  useEffect(() => {
    if (!board.hold.hand && !board.ghost) returnToPicker.current = pickerReturnAfter({ kind: 'release' });
  }, [board.hold.hand, board.ghost]);

  useEffect(() => {
    function markAction(event: KeyboardEvent): void {
      if (returnToPicker.current.kind === 'none') return;

      const changesIntent = matchesKey('copyMode', event.key) || matchesKey('place', event.key);
      if (changesIntent) returnToPicker.current = pickerReturnAfter({ kind: 'action' });
    }

    window.addEventListener('keydown', markAction, true);

    return () => window.removeEventListener('keydown', markAction, true);
  }, [board.hold.hand, board.ghost]);

  useEffect(() => {
    const state = pickerState(open, board.editor !== null);
    if (state === 'closed') {
      dialog.current?.close();

      return;
    }

    if (state === 'suspended-for-editor') {
      dialog.current?.close();

      return;
    }

    dialog.current?.showModal();
    const fallback = dialog.current?.querySelector<HTMLElement>(`${LESSON_SELECTOR}, ${PICKER_CLOSE_SELECTOR}`);
    const preferred = selected.current === null
      ? dialog.current?.querySelector<HTMLElement>(LESSON_SELECTOR)
      : lessonNode(dialog.current, selected.current);
    (preferred ?? fallback)?.focus();
  }, [open, board.editor]);

  return { open, dialog, selected, returnToPicker, show, close };
}
