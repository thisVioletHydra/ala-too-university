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
  onDrop: () => void
  children: ReactNode
};

export function SlotCell(props: SlotCellProps) {
  const board = useBoard();
  const lessons = useSchedule((state) => state.lessons);
  const key = slotKey(props.day, props.timeSlotId);
  const advice = board.advice.get(key);
  const home = isHomeCell(board.ghost, board.hold.hand, lessons, props.day, props.timeSlotId);
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
      data-tone={board.advice.size > 0 ? tone : 'idle'}
      data-over={over ? 'yes' : 'no'}
      data-slot={key}
      data-aim={board.hold.aim === key ? 'yes' : 'no'}
      tabIndex={props.tabStop ? 0 : -1}
      onPointerOver={props.onPoint}
      onClick={props.onDrop}
    >
      {props.children}
      {tip ? <ConflictTip text={tip} anchor={anchor} /> : null}
    </div>
  );
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
      : null;
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
