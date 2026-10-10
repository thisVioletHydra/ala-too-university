import type { PickerReturn } from '#interaction/picker.return.ts';
import type { LessonCardProps } from '#ui/lesson-card/lesson-card.tsx';
import type { RefObject } from 'react';

import { keyboardHints, matchesKey } from '#accessible/keyboard.bindings.ts';
import { pickerReturnAfter } from '#interaction/picker.return.ts';
import { useBoard } from '#app/providers.tsx';
import { focusNext } from '#accessible/focus.group.ts';
import { LessonCard } from '#ui/lesson-card/lesson-card.tsx';
import { createPortal } from 'react-dom';

import styles from '#ui/schedule-grid/schedule-grid.module.css';

type SlotPickerProps = {
  label: string
  items: LessonCardProps[]
  dialog: RefObject<HTMLDialogElement | null>
  selected: RefObject<string | null>
  returnToPicker: RefObject<PickerReturn>
  onClose: (restore?: boolean) => void
};

/** Список занятий одной ячейки, когда их три и больше. */
export function SlotPicker({ label, items, dialog: dialogRef, selected: selectedRef, returnToPicker: returnToPickerRef, onClose }: SlotPickerProps) {
  const board = useBoard();

  function handleKeyDown(event: React.KeyboardEvent<HTMLDialogElement>): void {
    event.stopPropagation();
    const cards = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-lesson-id]'));
    const active = cards.indexOf(document.activeElement as HTMLElement);
    if (matchesKey('next', event.key) || matchesKey('previous', event.key)) {
      event.preventDefault();
      const direction = matchesKey('next', event.key) ? 1 : -1;
      focusNext(cards, direction);
    }

    if (active >= 0 && (matchesKey('edit', event.key) || matchesKey('place', event.key))) {
      event.preventDefault();
      if (event.repeat) return;

      const item = items[active];
      if (matchesKey('edit', event.key)) {
        selectedRef.current = item.lessonId;
        board.setEditor({ mode: 'edit', lessonId: item.lessonId });
      } else {
        returnToPickerRef.current = pickerReturnAfter({ kind: 'grab', lessonId: item.lessonId });
        onClose(false);
        item.onGrab();
      }
    }

    if (matchesKey('switchArea', event.key)) {
      event.preventDefault();
      const stops = [...cards];
      const close = event.currentTarget.querySelector<HTMLElement>('[data-close-picker]');
      if (close) stops.push(close);

      focusNext(stops, event.shiftKey ? -1 : 1);
    }
  }

  return createPortal(<dialog ref={dialogRef} data-slot-picker className={styles.picker} aria-label={`Занятия: ${label}`}
    onCancel={(event) => { event.preventDefault();
      onClose();
    }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    onKeyDown={handleKeyDown}>
    <header className={styles.pickerHead}><div><strong>{label}</strong><span>Занятий одновременно: {items.length}</span></div>
      <button
        type="button"
        data-close-picker
        aria-label="Закрыть список занятий"
        onClick={() => onClose()}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
    </header>
    <div className={styles.pickerList}>{items.map((item) => <LessonCard key={item.lessonId} {...item}
      listView
      onGrab={() => { returnToPickerRef.current = pickerReturnAfter({ kind: 'grab', lessonId: item.lessonId });
        onClose(false);
        item.onGrab();
      }} />)}</div>
    <p className={styles.pickerHint}>{keyboardHints.picker.map(([key, action]) => `${key} ${action}`).join(' · ')}</p>
  </dialog>, document.body);
}
