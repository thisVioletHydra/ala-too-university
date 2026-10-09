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

  return (
    <SectionFace
      {...props}
      overlay={false}
      dragging={isDragging || held}
      dim={(tray && !mine) || Boolean(props.dimmed)}
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
  const board = useBoard();
  const progress = sectionProgress(props.section, props.lessons);
  const missingTeacherCount = props.lessons.filter((lesson) => lesson.sectionId === props.section.id && !lesson.teacherId).length;
  const needsTeacher = props.teacherName === null;
  const flashed = useBoard().flash.sectionId === props.section.id;

  return (
    <article
      ref={props.nodeRef}
      className={styles.card}
      aria-label={`${props.courseName}, ${props.section.code}, ${props.teacherName ?? 'Без преподавателя'}. ${progressPhrase(progress.state, progress.placed, progress.required)}`}
      data-state={progress.state}
      data-show-course={props.showCourse ? 'yes' : 'no'}
      data-needs-teacher={needsTeacher ? 'yes' : 'no'}
      data-excess={progress.placed > progress.required ? 'yes' : 'no'}
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
        {!props.overlay && props.dragging ? <button type="button" className={styles.editSection} aria-label={`Редактировать секцию ${props.section.code}`} title="Редактировать секцию" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); board.setEditor({ mode: 'section', sectionId: props.section.id }); }}><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m3 10 7-7 3 3-7 7-4 1 1-4ZM9 4l3 3" /></svg></button> : null}
        <span className={styles.teacher} data-missing={props.teacherName === null ? 'yes' : 'no'}>{props.teacherName === null ? <span className={styles.teacherWarning} aria-hidden="true">!</span> : null}{props.teacherName ?? 'Нужен преподаватель'}</span>
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
      </p>
      {needsTeacher && props.teacherName !== null ? <span className={styles.teacherNotice}><span className={styles.teacherWarning} aria-hidden="true">!</span>{missingTeacherCount} {lessonsWord(missingTeacherCount)} без преподавателя</span> : null}
      <div className={styles.foot}>
        <span className={styles.segments} role="progressbar" aria-label="Занятия секции" aria-valuemin={0} aria-valuemax={Math.max(progress.required, progress.placed)} aria-valuenow={progress.placed}>
          {Array.from({ length: Math.max(progress.required, progress.placed) }, (_, index) => <i key={index} data-filled={index < progress.placed ? 'yes' : 'no'} data-extra={index >= progress.required ? 'yes' : 'no'} />)}
        </span>
        <span className={styles.phrase}>
          {progress.placed > progress.required ? <span aria-hidden="true">⚠ </span> : null}
          {progressPhrase(progress.state, progress.placed, progress.required)}
        </span>
      </div>
      {progress.placed > progress.required ? <p className={styles.excessCount}>{progress.placed} занятий · Норма {progress.required} в неделю</p> : null}
    </article>
  );
}
