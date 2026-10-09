import type { PickerReturn } from '#interaction/picker-return.ts';
import type { LessonCardProps } from '#ui/lesson-card/lesson-card.tsx';
import type { RefObject } from 'react';

import { matchesKey } from '#interaction/keyboard.ts';
import { pickerReturnAfter } from '#interaction/picker-return.ts';
import { useBoard } from '#app/providers.tsx';
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
export function SlotPicker(props: SlotPickerProps) {
  const board = useBoard();

  return createPortal(<dialog ref={props.dialog} data-slot-picker className={styles.picker} aria-label={`Занятия: ${props.label}`}
    onCancel={(event) => { event.preventDefault();
      props.onClose();
    }}
    onClick={(event) => { if (event.target === event.currentTarget) props.onClose(); }}
    onKeyDown={(event) => {
      event.stopPropagation();
      const cards = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-lesson-id]'));
      const active = cards.indexOf(document.activeElement as HTMLElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const next = active < 0 ? (event.key === 'ArrowDown' ? 0 : cards.length - 1) : (active + (event.key === 'ArrowDown' ? 1 : -1) + cards.length) % cards.length;
        cards[next]?.focus();
      }

      if (active >= 0 && (matchesKey('edit', event.key) || matchesKey('place', event.key))) {
        event.preventDefault();
        if (event.repeat) return;

        const item = props.items[active];
        if (matchesKey('edit', event.key)) {
          props.selected.current = item.lessonId;
          board.setEditor({ mode: 'edit', lessonId: item.lessonId });
        } else {
          props.returnToPicker.current = pickerReturnAfter(props.returnToPicker.current, { kind: 'grab', lessonId: item.lessonId });
          props.onClose(false);
          item.onGrab();
        }
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        const stops = [...cards, event.currentTarget.querySelector<HTMLElement>('[data-close-picker]')!];
        const index = stops.indexOf(document.activeElement as HTMLElement);
        stops[(index + (event.shiftKey ? -1 : 1) + stops.length) % stops.length]?.focus();
      }
    }}>
    <header className={styles.pickerHead}><div><strong>{props.label}</strong><span>Занятий одновременно: {props.items.length}</span></div>
      <button
        type="button"
        data-close-picker
        aria-label="Закрыть список занятий"
        onClick={() => props.onClose()}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
    </header>
    <div className={styles.pickerList}>{props.items.map((item) => <LessonCard key={item.lessonId} {...item}
      listView
      onGrab={() => { props.returnToPicker.current = pickerReturnAfter(props.returnToPicker.current, { kind: 'grab', lessonId: item.lessonId });
        props.onClose(false);
        item.onGrab();
      }} />)}</div>
    <p className={styles.pickerHint}>↑↓ выбрать · Enter редактировать · Пробел взять · Esc закрыть</p>
  </dialog>, document.body);
}
