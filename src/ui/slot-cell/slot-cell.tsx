import type { WeekDay } from '#schedule/types.ts';
import type { ReactNode, RefObject } from 'react';

import { useDroppable } from '@dnd-kit/core';
import { slotKey, useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { useRef } from 'react';
import { useAnchoredOverlay } from './slotCell.position.ts';
import { isHomeCell, reasonText } from './slotCell.model.ts';
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
  let tone = 'idle';
  if (!home && advice) tone = advice.ok ? 'ok' : 'bad';

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
        if (event.target.matches(':focus-visible') === false) return;

        event.stopPropagation();
        props.onFocus();
      }}
      onClick={props.onDrop}
    >
      {props.children}
      {over && advice ? <DropHint ok={advice.ok} remove={advice.text === 'Убрать'} anchor={anchor} /> : null}
      {props.unavailable && board.advice.size === 0 ? <span className={styles.unavailable}>Преподаватель недоступен</span> : null}
      {tip ? <ConflictTip text={tip} anchor={anchor} /> : null}
    </div>
  );
}

function DropHint(props: { ok: boolean, remove: boolean, anchor: RefObject<HTMLDivElement | null> }) {
  const hint = useRef<HTMLSpanElement>(null);

  useAnchoredOverlay({ anchor: props.anchor, overlay: hint, placement: 'center' });
  let label = '× Недоступно';
  if (props.ok) label = '✓ Поставить сюда';

  if (props.remove) label = '− Убрать';

  return createPortal(<span ref={hint} className={styles.dropLabel} data-ok={props.ok ? 'yes' : 'no'} data-remove={props.remove ? 'yes' : 'no'}>{label}</span>, document.body);
}

function ConflictTip(props: { text: string, anchor: RefObject<HTMLDivElement | null> }) {
  const tip = useRef<HTMLParagraphElement>(null);

  useAnchoredOverlay({ anchor: props.anchor, overlay: tip, placement: 'below', text: props.text });

  return createPortal(
    <p ref={tip} className={styles.tip}>
      <span className={styles.bang} aria-hidden="true">!</span>
      <span className={styles.tipText}>{props.text}</span>
    </p>,
    document.body,
  );
}
