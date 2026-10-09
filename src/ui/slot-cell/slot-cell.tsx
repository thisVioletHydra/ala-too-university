import type { SlotAdvice } from '#schedule/conflicts.ts';
import type { Lesson, WeekDay } from '#schedule/types.ts';
import type { ReactNode, RefObject } from 'react';
import type { ActiveDrag, Hand } from '#app/providers.tsx';

import { useDroppable } from '@dnd-kit/core';
import { slotKey, useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import styles from '#ui/slot-cell/slot-cell.module.css';

type SlotCellProps = {
  day: WeekDay
  timeSlotId: string
  tabStop: boolean
  onPoint: () => void
  onFocus: () => void
  onDrop: () => void
  children: ReactNode
  label?: string
  unavailable?: boolean
};

export function SlotCell(props: SlotCellProps) {
  const board = useBoard();
  const lessons = useSchedule((state) => state.lessons);
  const key = slotKey(props.day, props.timeSlotId);
  const advice = board.advice.get(key);
  const home = isHomeCell(board.repeat ? null : board.ghost, board.repeat ? null : board.hold.hand, lessons, props.day, props.timeSlotId);
  const over = !home && board.overKey === key;
  const tone = home || !advice ? 'idle' : advice.ok ? 'ok' : 'bad';
  const drop = useDroppable({
    id: key,
    data: { kind: 'slot', day: props.day, timeSlotId: props.timeSlotId },
  });
  const anchor = useRef<HTMLDivElement | null>(null);
  const tip = over ? reasonText(advice, board.teacherNames) : null;

  return (
    <div
      ref={(element) => {
        anchor.current = element;
        drop.setNodeRef(element);
      }}
      className={styles.cell}
      aria-label={props.label}
      data-tone={board.advice.size > 0 ? tone : 'idle'}
      data-remove={advice?.text === 'Убрать' ? 'yes' : 'no'}
      data-unavailable={props.unavailable && board.advice.size === 0 ? 'yes' : 'no'}
      data-over={over ? 'yes' : 'no'}
      data-origin={home ? 'yes' : 'no'}
      data-slot={key}
      data-aim={board.hold.aim === key ? 'yes' : 'no'}
      data-carrying={board.hold.hand ? 'yes' : 'no'}
      tabIndex={props.tabStop ? 0 : -1}
      onPointerOver={props.onPoint}
      onFocus={(event) => {
        if (!event.target.matches(':focus-visible')) return;
        event.stopPropagation();
        props.onFocus();
      }}
      onClick={props.onDrop}
    >
      {props.children}
      {home ? <span className={styles.origin}><strong>Исходное место</strong><span>Занятие в переносе</span></span> : null}
      {over && advice ? <DropHint ok={advice.ok} remove={advice.text === 'Убрать'} anchor={anchor} /> : null}
      {props.unavailable && board.advice.size === 0 ? <span className={styles.unavailable}>Преподаватель недоступен</span> : null}
      {tip ? <ConflictTip text={tip} anchor={anchor} /> : null}
    </div>
  );
}

function DropHint(props: { ok: boolean, remove: boolean, anchor: RefObject<HTMLDivElement | null> }) {
  const hint = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    function place(): void {
      const cell = props.anchor.current;
      const label = hint.current;
      if (!cell || !label) return;
      const rect = cell.getBoundingClientRect();
      label.style.left = `${rect.left + rect.width / 2}px`;
      label.style.top = `${rect.top + rect.height / 2}px`;
      label.style.maxWidth = `${Math.max(0, rect.width - 16)}px`;
    }
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [props.anchor]);

  return createPortal(<span ref={hint} className={styles.dropLabel} data-ok={props.ok ? 'yes' : 'no'} data-remove={props.remove ? 'yes' : 'no'}>{props.remove ? '− Убрать' : props.ok ? '✓ Поставить сюда' : '× Недоступно'}</span>, document.body);
}

function ConflictTip(props: { text: string, anchor: RefObject<HTMLDivElement | null> }) {
  const tip = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const node = tip.current;
    if (!node || !props.anchor.current) return;

    function place() {
      const el = tip.current;
      const box = props.anchor.current;
      if (!el || !box) return;

      const rect = box.getBoundingClientRect();
      const width = el.offsetWidth;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      el.style.insetBlockStart = `${rect.bottom + 4}px`;
      el.style.insetInlineStart = `${left}px`;
      el.style.visibility = 'visible';
    }

    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);

    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [props.anchor, props.text]);

  return createPortal(
    <p ref={tip} className={styles.tip}>
      <span className={styles.bang} aria-hidden="true">!</span>
      <span className={styles.tipText}>{props.text}</span>
    </p>,
    document.body,
  );
}

function isHomeCell(
  ghost: ActiveDrag | null,
  hand: Hand | null,
  lessons: Lesson[],
  day: WeekDay,
  timeSlotId: string,
): boolean {
  const carried = ghost?.kind === 'lesson' && !ghost.copy
    ? ghost.lessonId
    : hand?.kind === 'lesson'
      ? hand.lessonId
      : hand?.kind === 'section' ? hand.originLessonId ?? null : null;
  if (carried === null || carried === undefined) return false;

  const lesson = lessons.find((item) => item.id === carried);

  return lesson?.day === day && lesson.timeSlotId === timeSlotId;
}

function reasonText(advice: SlotAdvice | undefined, names: Record<string, string>): string | null {
  if (!advice || advice.ok || !advice.text) return null;

  if (advice.text === 'Преподаватель занят' && advice.teacherId) {
    const name = names[advice.teacherId];
    if (name) return `${name} занят в этом слоте`;
  }

  return advice.text;
}
