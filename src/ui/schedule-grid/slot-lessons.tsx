import type { PickerReturn } from '#interaction/picker-return.ts';
import type { LessonCardProps } from '#ui/lesson-card/lesson-card.tsx';

import { matchesKey } from '#interaction/keyboard.ts';
import { pickerReturnAfter, pickerReturnLesson } from '#interaction/picker-return.ts';
import { groupView, groupCommand, pickerState } from '#interaction/group-policy.ts';
import { useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { LessonCard, RoomIcon, SourcePlaceholder } from '#ui/lesson-card/lesson-card.tsx';
import { SlotPicker } from '#ui/schedule-grid/slot-picker.tsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import styles from '#ui/schedule-grid/schedule-grid.module.css';

export function SlotLessons(props: { label: string, items: LessonCardProps[] }) {
  const board = useBoard();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const selected = useRef<string | null>(null);
  const returnToPicker = useRef<PickerReturn>({ kind: 'none' });
  const [position, setPosition] = useState<number | null>(null);
  const view = groupView(props.items.length);
  const multiple = view !== 'single';
  const strips = view === 'strips';
  const items = props.items;
  const visible = multiple ? items.slice(0, 2) : items;
  const carried = board.ghost ?? board.hold.hand;
  const sourceIndex = carried?.kind === 'lesson' ? items.findIndex((item) => item.lessonId === carried.lessonId) : -1;
  const reordering = items.length === 2 && sourceIndex >= 0 && !board.repeat;
  const insertion = position ?? Math.max(0, sourceIndex);
  const ordered = reordering && insertion !== sourceIndex ? [...visible].reverse() : visible;

  useEffect(() => {
    function restorePicker(): void {
      const lessonId = pickerReturnLesson(returnToPicker.current, items.map((item) => item.lessonId));
      if (lessonId === null || lessonId === undefined) return;

      returnToPicker.current = pickerReturnAfter(returnToPicker.current, { kind: 'release' });
      selected.current = lessonId;
      setOpen(true);
    }

    window.addEventListener('schedule:cancel-hand', restorePicker);
    return () => window.removeEventListener('schedule:cancel-hand', restorePicker);
  }, [items]);

  useEffect(() => {
    if (!board.hold.hand && !board.ghost) returnToPicker.current = pickerReturnAfter(returnToPicker.current, { kind: 'release' });
  }, [board.hold.hand, board.ghost]);

  useEffect(() => {
    function markAction(event: KeyboardEvent): void {
      if (returnToPicker.current.kind === 'none') return;

      const changesIntent = matchesKey('copyMode', event.key) || matchesKey('place', event.key);
      if (changesIntent) returnToPicker.current = pickerReturnAfter(returnToPicker.current, { kind: 'action' });
    }

    window.addEventListener('keydown', markAction, true);
    return () => window.removeEventListener('keydown', markAction, true);
  }, [board.hold.hand, board.ghost]);

  useEffect(() => { setPosition(null); }, [carried?.kind === 'lesson' ? carried.lessonId : null]);
  useLayoutEffect(() => {
    const slot = root.current?.closest<HTMLElement>('[data-slot]');
    if (slot === null || slot === undefined) return;

    if (reordering) slot.dataset.reorderTarget = items[insertion].lessonId;
    else delete slot.dataset.reorderTarget;

    return () => { delete slot.dataset.reorderTarget; };
  }, [reordering, insertion, items]);

  /** Полоски раскрываются, только когда ничего не несут и не тащат. */
  function cannotOpenStrips(): boolean {
    return !strips || board.hold.hand !== null || board.ghost !== null || board.skipClick();
  }

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
    const state = pickerState(open, board.editor !== null);
    if (state === 'closed') return;

    if (state === 'suspended-for-editor') {
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
          (slot as HTMLElement)?.focus();
        } else {
          const direction = command === 'reorder-down' ? 1 : -1;
          setPosition(Math.max(0, Math.min(items.length - 1, insertion + direction)));
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

        if (matchesKey('remove', event.key)) {
          useSchedule.getState().unassignLesson(items[index].lessonId);
          (slot as HTMLElement)?.focus();
        }

        if (matchesKey('cancel', event.key)) (slot as HTMLElement)?.focus();

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          const next = items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
          root.current?.querySelector<HTMLElement>(`[data-lesson-id="${CSS.escape(next.lessonId)}"]`)?.focus();
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
      else root.current?.querySelector<HTMLElement>('[data-lesson-id]')?.focus();
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
  }, [multiple, strips, items, board.hold.hand, board.ghost, insertion]);

  useEffect(() => {
    if (reordering === false) return;

    const slot = root.current?.closest<HTMLElement>('[data-slot]');
    function point(event: PointerEvent): void {
      if (event.target instanceof Element && event.target.closest('[data-action]')) return;

      if (!slot || (event.movementX === 0 && event.movementY === 0)) return;

      const rect = root.current!.getBoundingClientRect();
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
    {open ? <SlotPicker
      label={props.label}
      items={items}
      dialog={dialog}
      selected={selected}
      returnToPicker={returnToPicker}
      onClose={close}
    /> : null}
  </div>;
}
