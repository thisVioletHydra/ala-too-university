import type { ReactNode } from 'react';
import type { LessonCardProps } from '#ui/lesson-card/lesson-card.tsx';

import { slotLessonsView } from '#ui/schedule-grid/slotLessons.view.ts';
import { usePairReorder } from '#ui/schedule-grid/slotLessons.reorder.ts';
import { useSlotCommands } from '#ui/schedule-grid/slotLessons.commands.ts';
import { useSlotPicker } from '#ui/schedule-grid/slotLessons.picker.ts';
import { dataAttribute } from '#ui/data-attribute.ts';
import { ROOM_TYPE_LABELS } from '#ui/room-type.ts';
import { LessonCard } from '#ui/lesson-card/lesson-card.tsx';
import { RoomIcon } from '#ui/lesson-card/lessonCard.roomIcon.tsx';
import { SourcePlaceholder } from '#ui/lesson-card/lessonCard.actions.tsx';
import { SlotPicker } from '#ui/schedule-grid/slot-picker.tsx';
import { sectionNumber } from '#ui/section-code.ts';
import { needsTeacher } from '#ui/teacher-label.ts';
import { useBoard } from '#app/providers.tsx';
import { useRef, useState } from 'react';

import styles from '#ui/schedule-grid/schedule-grid.module.css';

type SlotLessonsProps = {
  label: string
  items: LessonCardProps[]
};

export function SlotLessons({ label, items }: SlotLessonsProps) {
  const board = useBoard();
  const root = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<number | null>(null);
  const carried = board.ghost ?? board.hold.hand;
  const view = slotLessonsView({ items, carried, repeat: board.repeat, position });
  const picker = useSlotPicker({ items, root });

  usePairReorder({
    items,
    insertion: view.insertion,
    reordering: view.reordering,
    carried,
    root,
    setPosition,
  });

  useSlotCommands({
    items,
    multiple: view.multiple,
    strips: view.strips,
    insertion: view.insertion,
    root,
    setPosition,
    show: picker.show,
  });

  function renderStrip(item: LessonCardProps): ReactNode {
    const movedAway = board.repeat === false && carried?.kind === 'lesson' && carried.lessonId === item.lessonId;

    return (
      <div key={item.lessonId} className={styles.reorderItem}>
        <button
          type="button"
          className={styles.strip}
          data-slot-strip
          data-needs-teacher={dataAttribute(needsTeacher(item.teacherName))}
          data-lesson-id={item.lessonId}
          data-course={item.courseId}
          data-dimmed={dataAttribute(item.dimmed)}
          tabIndex={-1}
          aria-haspopup="dialog"
          aria-expanded={picker.open}
          aria-label={`${item.code}, ${item.courseName}, ${item.teacherName}, ${item.roomName}. Открыть список занятий`}
          title={`${item.courseName} · ${item.teacherName}`}
        >
          <span className={styles.stripCode}>
            <strong>{item.courseCode}</strong>
            <span>{sectionNumber(item.courseCode, item.code)}</span>
          </span>
          <span className={styles.stripRoom} title={`${ROOM_TYPE_LABELS[item.roomType]}: ${item.roomName}`}>
            <RoomIcon type={item.roomType} />
            {item.roomName}
          </span>
        </button>
        {movedAway ? <SourcePlaceholder lessonId={item.lessonId} code={item.code} strip /> : null}
      </div>
    );
  }

  function renderCards(): ReactNode {
    return view.ordered.map((item) => {
      if (picker.open) {
        return (
          <div key={item.lessonId} className={styles.summary}>
            <strong>{item.code}</strong>
            <span>{item.teacherName} · {item.roomName}</span>
          </div>
        );
      }

      const draggedItem = view.reordering && item.lessonId === items[view.sourceIndex].lessonId;

      return (
        <div key={item.lessonId} className={styles.reorderItem}>
          <LessonCard {...item} compact={view.multiple} sourceActions={view.reordering ? 'edit' : 'all'} />
          {draggedItem ? (
            <div className={styles.insertion} role="status">
              <strong>{item.code}</strong>
              <span>{view.insertion === 0 ? 'Поставить первым' : 'Поставить вторым'}</span>
            </div>
          ) : null}
        </div>
      );
    });
  }

  return (
    <div ref={root} className={styles.lessons}>
      {view.strips ? items.map(renderStrip) : renderCards()}
      {picker.open ? (
        <SlotPicker
          label={label}
          items={items}
          dialog={picker.dialog}
          selected={picker.selected}
          returnToPicker={picker.returnToPicker}
          onClose={picker.close}
        />
      ) : null}
    </div>
  );
}
