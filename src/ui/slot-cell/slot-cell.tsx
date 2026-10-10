import type { WeekDay } from '#schedule/types.ts';
import type { ReactNode } from 'react';

import { useDroppable } from '@dnd-kit/core';
import { slotKey, useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { isHomeCell } from './slotCell.model.ts';

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
  return (
    <div
      ref={(element) => drop.setNodeRef(element)}
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
      {props.unavailable && board.advice.size === 0 ? <span className={styles.unavailable}>Преподаватель недоступен</span> : null}
    </div>
  );
}
