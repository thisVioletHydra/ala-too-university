import type { Lesson, Section } from '#schedule/types.ts';
import type { ProgressState } from '#schedule/section.progress.ts';

import { TEACHER_PLACEHOLDER } from '#ui/teacher-label.ts';
import { useDraggable } from '@dnd-kit/core';
import { useBoard } from '#app/providers.tsx';
import { sectionProgress } from '#schedule/section.progress.ts';
import { plural } from '#ui/plural.ts';
import { sectionNumber } from '#ui/section-code.ts';
import { dataAttribute } from '#ui/data-attribute.ts';

import styles from '#ui/section-card/section-card.module.css';

function lessonsWord(count: number): string {
  return plural(count, 'занятие', 'занятия', 'занятий');
}

function studentsWord(count: number): string {
  return plural(count, 'студент', 'студента', 'студентов');
}

function progressPhrase(state: ProgressState, placed: number, required: number): string {
  if (placed > required) return `Дополнительно: ${placed - required}`;

  if (state === 'done') return 'Поставлено полностью';

  if (state === 'empty') return 'Ещё не начинали';

  const left = Math.max(required - placed, 0);

  return `Осталось ${left} ${lessonsWord(left)}`;
}

type SectionFields = {
  showCourse?: boolean
  section: Section
  courseName: string
  courseCode: string
  teacherName: string | null
  lessons: Lesson[]
};

type SectionCardProps = SectionFields & {
  highlighted: boolean
  dimmed?: boolean
  index: number
  tabStop: boolean
  onGrab: () => void
};

export function SectionCard(props: SectionCardProps) {
  const board = useBoard();
  const held = board.hold.hand?.kind === 'section' && board.hold.hand.sectionId === props.section.id;
  const mine = held || (board.ghost?.kind === 'section' && board.ghost.sectionId === props.section.id);
  const busy = board.ghost !== null || board.hold.hand !== null;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `section:${props.section.id}`,
    data: { kind: 'section', sectionId: props.section.id },
    disabled: busy && !mine,
  });
  const tray = board.hold.hand?.kind === 'section' || board.ghost?.kind === 'section';

  function handleGrab(): void {
    if (board.skipClick() || board.ghost || board.hold.hand) return;

    props.onGrab();
  }

  return (
    <SectionFace
      {...props}
      dragging={isDragging || held}
      dim={(tray && !mine) || Boolean(props.dimmed)}
      aimed={board.hold.aim === `list:${props.index}`}
      nodeRef={setNodeRef}
      listeners={listeners}
      attributes={attributes}
      onGrab={handleGrab}
    />
  );
}

type SectionFaceProps = SectionFields & {
  highlighted: boolean
  dragging: boolean
  dim: boolean
  aimed: boolean
  tabStop: boolean
  nodeRef?: (element: HTMLElement | null) => void
  listeners?: ReturnType<typeof useDraggable>['listeners']
  attributes?: ReturnType<typeof useDraggable>['attributes']
  onGrab?: () => void
};

function SectionFace({ showCourse, section, courseName, courseCode, teacherName, lessons, highlighted, dragging, dim, aimed, tabStop, nodeRef, listeners, attributes, onGrab }: SectionFaceProps) {
  const board = useBoard();
  const progress = sectionProgress(section, lessons);
  const needsTeacher = teacherName === null;
  const flashed = board.flash.sectionId === section.id;
  const canEdit = dragging;
  const exceedsRequired = progress.placed > progress.required;
  const progressLabel = progressPhrase(progress.state, progress.placed, progress.required);
  const segmentCount = Math.max(progress.required, progress.placed);

  function handleEdit(event: React.MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    board.setEditor({ mode: 'section', sectionId: section.id });
  }

  return (
    <article
      ref={nodeRef}
      className={styles.card}
      aria-label={`${courseName}, ${section.code}, ${teacherName ?? 'Без преподавателя'}. ${progressLabel}`}
      data-state={progress.state}
      data-show-course={dataAttribute(showCourse)}
      data-needs-teacher={dataAttribute(needsTeacher)}
      data-excess={dataAttribute(exceedsRequired)}
      data-course={section.courseId}
      data-highlighted={dataAttribute(highlighted)}
      data-dragging={dataAttribute(dragging)}
      data-dim={dataAttribute(dim)}
      data-aim={dataAttribute(aimed)}
      data-flash={dataAttribute(flashed)}
      data-section-id={section.id}
      {...listeners}
      {...attributes}
      tabIndex={tabStop ? 0 : -1}
      onClick={onGrab}
    >
      <span className={styles.rail} aria-hidden="true" />
      <div className={styles.head}>
        {canEdit && (
          <button
            type="button"
            className={styles.editSection}
            aria-label={`Редактировать секцию ${section.code}`}
            title="Редактировать секцию"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleEdit}
          >
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              aria-hidden="true"
            >
              <path d="m3 10 7-7 3 3-7 7-4 1 1-4ZM9 4l3 3" />
            </svg>
          </button>
        )}
        <span className={styles.teacher} data-missing={dataAttribute(needsTeacher)}>
          {needsTeacher && (
            <span className={styles.teacherWarning} aria-hidden="true">!</span>
          )}
          {teacherName ?? TEACHER_PLACEHOLDER}
        </span>
        <span className={styles.chip}>{courseCode}</span>
        <span className={styles.no}>{sectionNumber(courseCode, section.code)}</span>
        <span className={styles.count} title={`Поставлено ${progress.placed} из ${progress.required}`}>
          {progress.placed}
          <span className={styles.slash} aria-hidden="true">/</span>
          {progress.required}
        </span>
      </div>
      <p className={styles.name}>{courseName}</p>
      <p className={styles.meta}>
        <span className={styles.students}>{section.studentsCount} {studentsWord(section.studentsCount)}</span>
      </p>

      <div className={styles.foot}>
        <span
          className={styles.segments}
          role="progressbar"
          aria-label="Занятия секции"
          aria-valuemin={0}
          aria-valuemax={segmentCount}
          aria-valuenow={progress.placed}
        >
          {Array.from({ length: segmentCount }, (_, index) => (
            <i
              key={index}
              data-filled={dataAttribute(index < progress.placed)}
              data-extra={dataAttribute(index >= progress.required)}
            />
          ))}
        </span>
        <span className={styles.phrase}>
          {exceedsRequired && <span aria-hidden="true">⚠ </span>}
          {progressLabel}
        </span>
      </div>
      {exceedsRequired && (
        <p className={styles.excessCount}>
          {progress.placed} занятий · Норма {progress.required} в неделю
        </p>
      )}
    </article>
  );
}
