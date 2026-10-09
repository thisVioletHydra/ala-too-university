import type { Lesson, Section } from '#schedule/types.ts';
import type { ProgressState } from '#schedule/section-progress.ts';

import { useDraggable } from '@dnd-kit/core';
import { useBoard } from '#app/providers.tsx';
import { sectionProgress } from '#schedule/section-progress.ts';
import { plural } from '#ui/plural.ts';

import styles from '#ui/section-card/section-card.module.css';

function lessonsWord(count: number): string {
  return plural(count, 'занятие', 'занятия', 'занятий');
}

function studentsWord(count: number): string {
  return plural(count, 'студент', 'студента', 'студентов');
}

function progressPhrase(state: ProgressState, placed: number, required: number): string {
  if (state === 'done') return 'Поставлено полностью';

  if (state === 'empty') return 'Ещё не начинали';

  const left = Math.max(required - placed, 0);

  return `Осталось ${left} ${lessonsWord(left)}`;
}

type SectionFields = {
  section: Section
  courseName: string
  courseCode: string
  teacherName: string | null
  lessons: Lesson[]
};

type SectionCardProps = SectionFields & {
  highlighted: boolean
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

  return (
    <SectionFace
      {...props}
      overlay={false}
      dragging={isDragging || held}
      dim={tray && !mine}
      aimed={board.hold.aim === `list:${props.index}`}
      nodeRef={setNodeRef}
      listeners={listeners}
      attributes={attributes}
      onGrab={() => {
        if (board.skipClick() || board.ghost || board.hold.hand) return;

        props.onGrab();
      }}
    />
  );
}

export function SectionPreview(props: SectionFields) {
  return (
    <SectionFace
      {...props}
      highlighted={false}
      overlay
      dragging={false}
      dim={false}
      aimed={false}
      tabStop={false}
    />
  );
}

function sectionNo(courseCode: string, code: string): string {
  const prefix = `${courseCode}-`;
  if (courseCode.length > 0 && code.startsWith(prefix)) return code.slice(prefix.length);

  return code;
}

type SectionFaceProps = SectionFields & {
  highlighted: boolean
  overlay: boolean
  dragging: boolean
  dim: boolean
  aimed: boolean
  tabStop: boolean
  nodeRef?: (element: HTMLElement | null) => void
  listeners?: ReturnType<typeof useDraggable>['listeners']
  attributes?: ReturnType<typeof useDraggable>['attributes']
  onGrab?: () => void
};

function SectionFace(props: SectionFaceProps) {
  const progress = sectionProgress(props.section, props.lessons);
  const width = Math.min(progress.placed / progress.required, 1) * 100;
  const flashed = useBoard().flash.sectionId === props.section.id;

  return (
    <article
      ref={props.nodeRef}
      className={styles.card}
      data-state={progress.state}
      data-course={props.section.courseId}
      data-highlighted={props.highlighted ? 'yes' : 'no'}
      data-dragging={props.dragging ? 'yes' : 'no'}
      data-dim={props.dim ? 'yes' : 'no'}
      data-overlay={props.overlay ? 'yes' : 'no'}
      data-aim={props.aimed ? 'yes' : 'no'}
      data-flash={flashed ? 'yes' : 'no'}
      data-section-id={props.section.id}
      {...props.listeners}
      {...props.attributes}
      tabIndex={props.tabStop ? 0 : -1}
      onClick={props.onGrab}
    >
      <span className={styles.rail} aria-hidden="true" />
      <div className={styles.head}>
        <span className={styles.chip}>{props.courseCode}</span>
        <span className={styles.no}>{sectionNo(props.courseCode, props.section.code)}</span>
        <span className={styles.count} title={`Поставлено ${progress.placed} из ${progress.required}`}>
          {progress.placed}
          <span className={styles.slash} aria-hidden="true">/</span>
          {progress.required}
        </span>
      </div>
      <p className={styles.name}>{props.courseName}</p>
      <p className={styles.meta}>
        <span className={styles.students}>{props.section.studentsCount} {studentsWord(props.section.studentsCount)}</span>
        <span
          className={styles.teacher}
          data-missing={props.teacherName === null ? 'yes' : 'no'}
        >
          {props.teacherName ?? 'Без преподавателя'}
        </span>
      </p>
      <div className={styles.foot}>
        <span className={styles.track}>
          <span className={styles.bar} style={{ inlineSize: `${width}%` }} />
        </span>
        <span className={styles.phrase}>{progressPhrase(progress.state, progress.placed, progress.required)}</span>
      </div>
    </article>
  );
}
