import type { Course, Lesson, Room, ScheduleCatalog, Section, Teacher, WeekDay } from '#schedule/types.ts';

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
      <div className={styles.corner} aria-hidden="true" />
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
            return (
              <SlotCell
                key={day.id}
                day={day.id}
                timeSlotId={timeSlot.id}
                unavailable={props.teacherId !== null && props.catalog.blockedSlots.some((blocked) => blocked.teacherId === props.teacherId && blocked.day === day.id && blocked.timeSlotId === timeSlot.id)}
                tabStop={dayIndex === props.dayIndex && slotIndex === props.slotIndex}
                onPoint={() => props.onPoint(dayIndex, slotIndex)}
                onFocus={() => props.onFocus(dayIndex, slotIndex)}
                onDrop={() => props.onDrop(dayIndex, slotIndex)}
                label={`${day.label}, ${timeSlot.start}–${timeSlot.end}, занятий: ${lessons.length}`}
              >
                <SlotLessons label={`${day.label} · ${timeSlot.start}–${timeSlot.end}`} items={lessons.map((lesson) => {
                  const section = findSection(props.catalog, lesson.sectionId);
                  const teacher = findTeacher(props.catalog, lesson.teacherId);
                  const room = findRoom(props.catalog, lesson.roomId);
                  if (!section || !room) return null;

                  return {
                    lessonId: lesson.id,
                    sectionId: section.id,
                    courseId: section.courseId,
                    courseCode: findCourse(props.catalog, section.courseId)?.code ?? section.code,
                    courseName: findCourse(props.catalog, section.courseId)?.name ?? section.code,
                    code: section.code,
                    teacherName: teacher?.shortName ?? 'Нужен преподаватель',
                    roomName: room.name,
                    roomType: room.type,
                    preferredRoomType: section.preferredRoomType,
                    highlighted: false,
                    dimmed: (props.teacherId !== null || props.roomId !== null) && !highlighted(lesson, props.teacherId, props.roomId),
                    onGrab: () => props.onGrab(lesson.id, dayIndex, slotIndex),
                    onDrop: () => props.onDrop(dayIndex, slotIndex),
                  };
                }).filter((item) => item !== null)} />
              </SlotCell>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

function highlighted(lesson: Lesson, teacherId: string | null, roomId: string | null): boolean {
  if (!teacherId && !roomId) return false;

  if (teacherId && lesson.teacherId !== teacherId) return false;

  if (roomId && lesson.roomId !== roomId) return false;

  return true;
}

function findCourse(catalog: ScheduleCatalog, id: string): Course | undefined {
  return catalog.courses.find((item) => item.id === id);
}

function findSection(catalog: ScheduleCatalog, id: string): Section | undefined {
  return catalog.sections.find((item) => item.id === id);
}

function findTeacher(catalog: ScheduleCatalog, id: string): Teacher | undefined {
  return catalog.teachers.find((item) => item.id === id);
}

function findRoom(catalog: ScheduleCatalog, id: string): Room | undefined {
  return catalog.rooms.find((item) => item.id === id);
}
