import type { LessonCardProps } from '#ui/lesson-card/lesson-card.tsx';

import { useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { LessonCard, RoomIcon, SourcePlaceholder } from '#ui/lesson-card/lesson-card.tsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from '#ui/schedule-grid/schedule-grid.module.css';

export function SlotLessons(props: { label: string, items: LessonCardProps[] }) {
  const board = useBoard();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const selected = useRef<string | null>(null);
  const grabbed = useRef<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const multiple = props.items.length > 1;
  const strips = props.items.length >= 3;
  const items = props.items;
  const visible = multiple ? items.slice(0, 2) : items;
  const carried = board.ghost ?? board.hold.hand;
  const sourceIndex = carried?.kind === 'lesson' ? items.findIndex((item) => item.lessonId === carried.lessonId) : -1;
  const reordering = items.length === 2 && sourceIndex >= 0 && !board.repeat;
  const insertion = position ?? Math.max(0, sourceIndex);
  const ordered = reordering && insertion !== sourceIndex ? [...visible].reverse() : visible;

  useEffect(() => {
    function restorePicker(): void {
      const lessonId = grabbed.current;
      if (!lessonId || !items.some((item) => item.lessonId === lessonId)) return;
      grabbed.current = null;
      selected.current = lessonId;
      setOpen(true);
    }
    window.addEventListener('schedule:cancel-hand', restorePicker);
    return () => window.removeEventListener('schedule:cancel-hand', restorePicker);
  }, [items]);

  useEffect(() => {
    if (!board.hold.hand && !board.ghost) grabbed.current = null;
  }, [board.hold.hand, board.ghost]);

  useEffect(() => {
    function markAction(event: KeyboardEvent): void {
      if (!grabbed.current || (!board.hold.hand && !board.ghost)) return;
      if (event.key === 'Shift' || event.key === ' ' || event.key === 'Spacebar') grabbed.current = null;
    }
    window.addEventListener('keydown', markAction, true);
    return () => window.removeEventListener('keydown', markAction, true);
  }, [board.hold.hand, board.ghost]);

  useEffect(() => { setPosition(null); }, [carried?.kind === 'lesson' ? carried.lessonId : null]);
  useLayoutEffect(() => {
    const slot = root.current?.closest<HTMLElement>('[data-slot]');
    if (!slot) return;
    if (reordering) slot.dataset.reorderTarget = items[insertion].lessonId;
    else delete slot.dataset.reorderTarget;
    return () => { delete slot.dataset.reorderTarget; };
  }, [reordering, insertion, items]);

  function show(): void {
    if (board.hold.hand || board.ghost) return;

    origin.current = root.current?.closest<HTMLElement>('[data-slot]') ?? null;
    setOpen(true);
  }

  function close(restore = true): void {
    dialog.current?.close();
    setOpen(false);
    if (restore) origin.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    if (board.editor) {
      dialog.current?.close();
      return;
    }

    dialog.current?.showModal();
    const selector = selected.current ? `[data-lesson-id="${CSS.escape(selected.current)}"]` : '[data-lesson-id]';
    const target = dialog.current?.querySelector<HTMLElement>(selector) ?? dialog.current?.querySelector<HTMLElement>('[data-lesson-id], [data-close-picker]');
    target?.focus();
  }, [open, board.editor]);

  useEffect(() => {
    if (open && board.ghost) close(false);
  }, [board.ghost, open]);

  useEffect(() => {
    const slot = root.current?.closest('[data-slot]');
    function choose(event: Event): void {
      if (!(event instanceof KeyboardEvent) || !multiple || board.ghost) return;

      const card = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-lesson-id]') : null;
      const held = board.hold.hand;
      if (held) {
        if (strips || held.kind !== 'lesson' || !items.some((item) => item.lessonId === held.lessonId) || event.shiftKey) return;
        if (!['ArrowUp', 'ArrowDown', ' '].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;
        const index = insertion;
        if (event.key === ' ') {
          useSchedule.getState().swapLessons(held.lessonId, items[index].lessonId);
          board.setHold({ ...board.hold, hand: null, overKey: null, overList: false });
          (slot as HTMLElement)?.focus();
        } else {
          setPosition(Math.max(0, Math.min(items.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
        }
        return;
      }
      if (!strips && card) {
        if (!['ArrowUp', 'ArrowDown', 'Enter', ' ', 'Escape', 'Delete', 'Backspace'].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;
        const index = items.findIndex((item) => item.lessonId === card.dataset.lessonId);
        if (index < 0) return;
        if (event.key === 'Delete' || event.key === 'Backspace') {
          useSchedule.getState().unassignLesson(items[index].lessonId);
          (slot as HTMLElement)?.focus();
        }
        if (event.key === 'Escape') (slot as HTMLElement)?.focus();
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          const next = items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
          root.current?.querySelector<HTMLElement>(`[data-lesson-id="${CSS.escape(next.lessonId)}"]`)?.focus();
        }
        if (event.key === 'Enter') board.setEditor({ mode: 'edit', lessonId: items[index].lessonId });
        if (event.key === ' ') items[index].onGrab();
        return;
      }

      if (event.target !== slot && !(event.target instanceof Element && event.target.closest('[data-slot-strip]'))) return;

      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (strips) show();
      else root.current?.querySelector<HTMLElement>('[data-lesson-id]')?.focus();
    }

    function openStrips(event: Event): void {
      if (!strips || board.hold.hand || board.ghost || board.skipClick()) return;

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
  }, [multiple, strips, items, board.hold.hand, board.ghost, insertion]);

  useEffect(() => {
    if (!reordering) return;
    const slot = root.current?.closest<HTMLElement>('[data-slot]');
    function point(event: PointerEvent): void {
      if (event.target instanceof Element && event.target.closest('[data-action]')) return;
      if (!slot || (event.movementX === 0 && event.movementY === 0)) return;
      const rect = root.current!.getBoundingClientRect();
      setPosition(event.clientY < rect.top + rect.height / 2 ? 0 : 1);
    }
    function confirm(event: MouseEvent): void {
      if (event.target instanceof Element && event.target.closest('[data-action]')) return;
      if (board.ghost || !carried || carried.kind !== 'lesson' || board.skipClick()) return;
      event.preventDefault();
      event.stopPropagation();
      useSchedule.getState().swapLessons(carried.lessonId, items[insertion].lessonId);
      board.setHold({ ...board.hold, hand: null, overKey: null, overList: false });
      slot?.focus();
    }
    slot?.addEventListener('pointermove', point);
    slot?.addEventListener('click', confirm, true);
    return () => {
      slot?.removeEventListener('pointermove', point);
      slot?.removeEventListener('click', confirm, true);
    };
  }, [reordering, carried, insertion, items, board]);

  return <div ref={root} className={styles.lessons}>
    {
    strips
      ? items.map((item) =>
          <div key={item.lessonId} className={styles.reorderItem}>
          <button
            key={item.lessonId}
            type="button"
            className={styles.strip}
            data-slot-strip
            data-needs-teacher={item.teacherName === 'Нужен преподаватель' ? 'yes' : 'no'}
            data-lesson-id={item.lessonId}
            data-course={item.courseId}
            data-dimmed={item.dimmed ? 'yes' : 'no'}
            tabIndex={-1}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`${item.code}, ${item.courseName}, ${item.teacherName}, ${item.roomName}. Открыть список занятий`}
            title={`${item.courseName} · ${item.teacherName}`}>
              <span className={styles.stripCode}><strong>{item.courseCode}</strong><span>{item.code.startsWith(`${item.courseCode}-`) ? item.code.slice(item.courseCode.length + 1) : item.code}</span></span>
              <span className={styles.stripRoom} title={`${item.roomType === 'COMPUTER_LAB' ? 'Компьютерная лаборатория' : 'Учебная аудитория'}: ${item.roomName}`}><RoomIcon type={item.roomType} />{item.roomName}</span>
          </button>
          {!board.repeat && carried?.kind === 'lesson' && carried.lessonId === item.lessonId ? <SourcePlaceholder lessonId={item.lessonId} code={item.code} strip /> : null}
          </div>
    )
      : ordered.map((item) => open
        ? <div key={item.lessonId} className={styles.summary}><strong>{item.code}</strong><span>{item.teacherName} · {item.roomName}</span></div>
        : <div key={item.lessonId} className={styles.reorderItem}>
          <LessonCard {...item} compact={multiple} />
          {reordering && item.lessonId === items[sourceIndex].lessonId ? <div className={styles.insertion} role="status"><strong>{item.code}</strong><span>{insertion === 0 ? 'Поставить первым' : 'Поставить вторым'}</span></div> : null}
        </div>)
    }
    {open ? createPortal(<dialog ref={dialog} data-slot-picker className={styles.picker} aria-label={`Занятия: ${props.label}`}
      onCancel={(event) => { event.preventDefault();
        close();
      }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      onKeyDown={(event) => {
        event.stopPropagation();
        const cards = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-lesson-id]'));
        const active = cards.indexOf(document.activeElement as HTMLElement);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const next = active < 0 ? (event.key === 'ArrowDown' ? 0 : cards.length - 1) : (active + (event.key === 'ArrowDown' ? 1 : -1) + cards.length) % cards.length;
          cards[next]?.focus();
        }

        if (active >= 0 && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          if (event.repeat) return;

          const item = items[active];
          if (event.key === 'Enter') {
            selected.current = item.lessonId;
            board.setEditor({ mode: 'edit', lessonId: item.lessonId });
          } else {
            grabbed.current = item.lessonId;
            close(false);
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
      <header className={styles.pickerHead}><div><strong>{props.label}</strong><span>Занятий одновременно: {items.length}</span></div>
        <button
          type="button"
          data-close-picker
          aria-label="Закрыть список занятий"
          onClick={() => close()}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
      </header>
      <div className={styles.pickerList}>{items.map((item) => <LessonCard key={item.lessonId} {...item}
        listView
        onGrab={() => { grabbed.current = item.lessonId;
          close(false);
          item.onGrab();
        }} />)}</div>
      <p className={styles.pickerHint}>↑↓ выбрать · Enter редактировать · Пробел взять · Esc закрыть</p>
    </dialog>, document.body) : null}
  </div>;
}
