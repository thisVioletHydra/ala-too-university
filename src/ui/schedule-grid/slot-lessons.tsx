import type { LessonCardProps } from '#ui/lesson-card/lesson-card.tsx';

import { useBoard } from '#app/providers.tsx';
import { LessonCard, RoomIcon } from '#ui/lesson-card/lesson-card.tsx';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from '#ui/schedule-grid/schedule-grid.module.css';

export function SlotLessons(props: { label: string, items: LessonCardProps[] }) {
  const board = useBoard();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const multiple = props.items.length > 1;
  const strips = props.items.length >= 3;
  const items = [...props.items].sort((a, b) => Number(Boolean(a.dimmed)) - Number(Boolean(b.dimmed)) || a.code.localeCompare(b.code, 'ru') || a.lessonId.localeCompare(b.lessonId));
  const visible = multiple ? items.slice(0, 2) : items;

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
    dialog.current?.showModal();
    dialog.current?.querySelector<HTMLElement>('[data-lesson-id]')?.focus();
  }, [open]);

  useEffect(() => {
    if (open && (board.ghost || board.editor)) close(false);
  }, [board.ghost, board.editor, open]);

  useEffect(() => {
    const slot = root.current?.closest('[data-slot]');
    function choose(event: Event): void {
      if (!(event instanceof KeyboardEvent) || !multiple || board.hold.hand || board.ghost) return;
      if (event.target !== slot && !(event.target instanceof Element && event.target.closest('[data-slot-strip]'))) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) show();
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
  }, [multiple, strips, board.hold.hand, board.ghost]);

  return <div ref={root} className={styles.lessons}>
    {strips ? items.map((item) => <button key={item.lessonId} type="button" className={styles.strip}
      data-slot-strip data-lesson-id={item.lessonId} data-course={item.courseId} data-dimmed={item.dimmed ? 'yes' : 'no'}
      tabIndex={-1} aria-haspopup="dialog" aria-expanded={open}
      aria-label={`${item.code}, ${item.courseName}, ${item.teacherName}, ${item.roomName}. Открыть список занятий`}
      title={`${item.courseName} · ${item.teacherName}`}>
      <span className={styles.stripCode}><strong>{item.courseCode}</strong><span>{item.code.startsWith(`${item.courseCode}-`) ? item.code.slice(item.courseCode.length + 1) : item.code}</span></span>
      <span className={styles.stripRoom} title={`${item.roomType === 'COMPUTER_LAB' ? 'Компьютерная лаборатория' : 'Учебная аудитория'}: ${item.roomName}`}><RoomIcon type={item.roomType} />{item.roomName}</span>
    </button>) : visible.map((item) => open
      ? <div key={item.lessonId} className={styles.summary}><strong>{item.code}</strong><span>{item.teacherName} · {item.roomName}</span></div>
      : <LessonCard key={item.lessonId} {...item} compact={multiple} />)}
    {open ? createPortal(<dialog ref={dialog} data-slot-picker className={styles.picker} aria-label={`Занятия: ${props.label}`}
      onCancel={(event) => { event.preventDefault(); close(); }}
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
          close(event.key === 'Enter');
          if (event.key === 'Enter') board.setEditor({ mode: 'edit', lessonId: item.lessonId });
          else item.onGrab();
        }
        if (event.key === 'Tab') {
          event.preventDefault();
          const stops = [...cards, event.currentTarget.querySelector<HTMLElement>('[data-close-picker]')!];
          const index = stops.indexOf(document.activeElement as HTMLElement);
          stops[(index + (event.shiftKey ? -1 : 1) + stops.length) % stops.length]?.focus();
        }
      }}>
      <header className={styles.pickerHead}><div><strong>{props.label}</strong><span>Занятий одновременно: {items.length}</span></div><button type="button" data-close-picker aria-label="Закрыть список занятий" onClick={() => close()}>×</button></header>
      <div className={styles.pickerList}>{items.map((item) => <LessonCard key={item.lessonId} {...item}
        onGrab={() => { close(false); item.onGrab(); }} />)}</div>
      <p className={styles.pickerHint}>↑↓ выбрать · Enter редактировать · Пробел взять · Esc закрыть</p>
    </dialog>, document.body) : null}
  </div>;
}
