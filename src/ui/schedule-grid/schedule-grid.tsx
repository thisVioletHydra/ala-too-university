import type { Lesson, ScheduleCatalog, WeekDay } from '#schedule/types.ts';

import { lessonCards } from './scheduleGrid.cards.ts';
import { SlotLessons } from '#ui/schedule-grid/slot-lessons.tsx';
import { SlotCell } from '#ui/slot-cell/slot-cell.tsx';
import { Fragment } from 'react';

import styles from '#ui/schedule-grid/schedule-grid.module.css';

const shortDay: Record<WeekDay, string> = {
  MON: 'Пн',
  TUE: 'Вт',
  WED: 'Ср',
  THU: 'Чт',
  FRI: 'Пт',
};

type ScheduleGridProps = {
  catalog: ScheduleCatalog
  lessons: Lesson[]
  teacherId: string | null
  roomId: string | null
  dayIndex: number
  slotIndex: number
  onEnter: () => void
  onGrab: (lessonId: string, dayIndex: number, slotIndex: number) => void
  onPoint: (dayIndex: number, slotIndex: number) => void
  onFocus: (dayIndex: number, slotIndex: number) => void
  onDrop: (dayIndex: number, slotIndex: number) => void
};

export function ScheduleGrid(props: ScheduleGridProps) {
  return (
    <div
      className={styles.grid}
      data-keyboard-zone="grid"
      onFocus={(event) => {
        if (event.target.matches(':focus-visible')) props.onEnter();
      }}
    >
      <div className={styles.corner} data-grid-corner aria-hidden="true" />
      {props.catalog.weekDays.map((day) => (
        <div key={day.id} className={styles.head} title={day.label}>{shortDay[day.id]}<span className={styles.dayName}>{day.label}</span></div>
      ))}
      {props.catalog.timeSlots.map((timeSlot, slotIndex) => (
        <Fragment key={timeSlot.id}>
          <div className={styles.time} title={`${timeSlot.start}–${timeSlot.end}`}>
            <span className={styles.start}>{timeSlot.start}</span>
            <span className={styles.end}>{timeSlot.end}</span>
          </div>
          {props.catalog.weekDays.map((day, dayIndex) => {
            const lessons = props.lessons.filter((lesson) => {
              return lesson.day === day.id && lesson.timeSlotId === timeSlot.id;
            });
            const items = lessonCards({ catalog: props.catalog, lessons, teacherId: props.teacherId, roomId: props.roomId, dayIndex, slotIndex, onGrab: props.onGrab, onDrop: props.onDrop });
            const unavailable = props.teacherId !== null && props.catalog.blockedSlots.some((blocked) => blocked.teacherId === props.teacherId && blocked.day === day.id && blocked.timeSlotId === timeSlot.id);
            return (
              <SlotCell
                key={day.id}
                day={day.id}
                timeSlotId={timeSlot.id}
                unavailable={unavailable}
                tabStop={dayIndex === props.dayIndex && slotIndex === props.slotIndex}
                onPoint={() => props.onPoint(dayIndex, slotIndex)}
                onFocus={() => props.onFocus(dayIndex, slotIndex)}
                onDrop={() => props.onDrop(dayIndex, slotIndex)}
                label={`${day.label}, ${timeSlot.start}–${timeSlot.end}, занятий: ${lessons.length}`}
              >
                <SlotLessons label={`${day.label} · ${timeSlot.start}–${timeSlot.end}`} items={items} />
              </SlotCell>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
