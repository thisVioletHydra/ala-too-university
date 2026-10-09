import type { RoomType } from '#schedule/types.ts';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useBoard } from '#app/providers.tsx';

import styles from '#ui/lesson-card/lesson-card.module.css';

type LessonFields = {
  courseId: string
  courseCode: string
  courseName: string
  code: string
  teacherName: string
  roomName: string
  roomType: RoomType
  preferredRoomType: RoomType
};

export type LessonCardProps = LessonFields & {
  lessonId: string
  sectionId: string
  highlighted: boolean
  dimmed?: boolean
  compact?: boolean
  listView?: boolean
  onGrab: () => void
  onDrop: () => void
};

export function LessonCard(props: LessonCardProps) {
  const board = useBoard();
  const landing = board.landing?.kind === 'card' && board.landing.lessonId === props.lessonId;
  const picked = landing || (board.ghost?.kind === 'lesson'
    ? !board.repeat && !board.ghost.copy && board.ghost.lessonId === props.lessonId
    : !board.repeat && board.hold.hand?.kind === 'lesson' && board.hold.hand.lessonId === props.lessonId);
  const busy = board.ghost !== null || board.hold.hand !== null;
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `lesson:${props.lessonId}`,
    data: { kind: 'lesson', lessonId: props.lessonId },
    disabled: busy && !picked,
  });

  return (
    <LessonFace
      {...props}
      dimmed={!picked && Boolean(props.dimmed)}
      overlay={false}
      held={picked}
      nodeRef={setNodeRef}
      listeners={listeners}
      attributes={attributes}
      onGrab={() => {
        if (board.skipClick() || board.ghost || board.hold.hand) return;

        props.onGrab();
      }}
      onPress={(event) => {
        if (board.skipClick() || board.ghost) return;

        if (board.hold.hand) {
          event.stopPropagation();
          props.onDrop();

          return;
        }

        props.onGrab();
      }}
    />
  );
}

export function LessonPreview(props: LessonFields) {
  return <LessonFace {...props} highlighted={false} overlay held={false} />;
}

export function RoomIcon(props: { type: RoomType }) {
  return <svg className={styles.roomIcon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {props.type === 'COMPUTER_LAB' ? <><rect x="3" y="3" width="10" height="7" rx="1" /><path d="m3 10-1 3h12l-1-3M6 12h4" /></> : <><rect x="2" y="2" width="12" height="8" rx="1" /><path d="M8 10v4m-3 0 3-2 3 2M5 5h6" /></>}
  </svg>;
}

function sectionNo(courseCode: string, code: string): string {
  const prefix = `${courseCode}-`;
  if (courseCode.length > 0 && code.startsWith(prefix)) return code.slice(prefix.length);

  return code;
}

type LessonFaceProps = LessonFields & {
  lessonId?: string
  highlighted: boolean
  dimmed?: boolean
  compact?: boolean
  listView?: boolean
  overlay: boolean
  held: boolean
  nodeRef?: (element: HTMLElement | null) => void
  listeners?: ReturnType<typeof useDraggable>['listeners']
  attributes?: ReturnType<typeof useDraggable>['attributes']
  onGrab?: () => void
  onDrop?: () => void
  onPress?: (event: { stopPropagation: () => void }) => void
};

function LessonFace(props: LessonFaceProps) {
  const board = useBoard();
  const flash = board.flash;
  const roomTypeName = props.roomType === 'COMPUTER_LAB' ? 'Компьютерная лаборатория' : 'Учебная аудитория';
  const flashed = props.lessonId !== undefined && flash.lessonId === props.lessonId;
  const carried = board.ghost ?? board.hold.hand;
  const actions = !props.overlay && props.lessonId && !board.repeat && carried?.kind === 'lesson' && carried.lessonId === props.lessonId;
  const body = (
    <>
      <span className={styles.rail} aria-hidden="true" />
      <span className={styles.head}>
        <span className={styles.chip}>{props.courseCode}</span>
        <span className={styles.no}>{sectionNo(props.courseCode, props.code)}</span>
        <span
          className={styles.room}
          title={`${roomTypeName}: ${props.roomName}`}
        >
          <RoomIcon type={props.roomType} />
          <span className={styles.sr}>{roomTypeName}: </span>
          {props.roomName}
        </span>
      </span>
      <span className={styles.name}>{props.courseName}</span>
      <span className={styles.foot}>
        <span className={styles.who}>{props.teacherName === 'Нужен преподаватель' ? <span className={styles.teacherWarning} aria-hidden="true">!</span> : null}{props.teacherName}</span>
      </span>
    </>
  );
  const shared = {
    className: styles.card,
    'data-compact': props.compact ? 'yes' : 'no',
    'data-list-view': props.listView ? 'yes' : 'no',
    'data-needs-teacher': props.teacherName === 'Нужен преподаватель' ? 'yes' : 'no',
    'data-course': props.courseId,
    'data-highlighted': props.highlighted ? 'yes' : 'no',
    'data-dimmed': props.dimmed ? 'yes' : 'no',
    'data-overlay': props.overlay ? 'yes' : 'no',
    'data-held': props.held ? 'yes' : 'no',
    'data-flash': flashed ? 'yes' : 'no',
  };

  if (props.overlay) {
    return <div {...shared}>{body}</div>;
  }

  return (
    <div className={styles.wrap} data-held={props.held ? 'yes' : 'no'} data-actions={actions ? 'yes' : 'no'} data-dimmed={props.dimmed ? 'yes' : 'no'}>
    <button
      type="button"
      ref={props.nodeRef}
      {...shared}
      {...props.listeners}
      {...props.attributes}
      data-lesson-id={props.lessonId}
      title={`${props.courseName} · ${props.code} · ${props.teacherName} · ${props.roomName}`}
      tabIndex={-1}
      onClick={(event) => {
        if (event.detail === 0) return;

        props.onPress?.(event);
      }}
    >
      {body}
    </button>
    {actions ? <SourcePlaceholder lessonId={props.lessonId!} code={props.code} /> : null}
    </div>
  );
}

export function SourcePlaceholder(props: { lessonId: string; code: string; strip?: boolean }) {
  return <div className={styles.actions} data-strip={props.strip ? 'yes' : 'no'} onClick={(event) => event.stopPropagation()}>
    <CardAction lessonId={props.lessonId} action="cancel" label={props.strip ? props.code : 'Исходное место'} />
    <CardAction lessonId={props.lessonId} action="edit" label="Редактировать" />
  </div>;
}

function CardAction(props: { lessonId: string; action: 'edit' | 'cancel'; label: string }) {
  const board = useBoard();
  const drop = useDroppable({ id: `card-action:${props.lessonId}:${props.action}`, data: { kind: 'card-action', lessonId: props.lessonId, action: props.action } });
  return <button ref={drop.setNodeRef} type="button" className={styles.action} data-action={props.action} data-over={drop.isOver ? 'yes' : 'no'} onClick={(event) => {
    event.stopPropagation();
    if (board.skipClick()) return;
    if (props.action === 'edit') board.setEditor({ mode: 'edit', lessonId: props.lessonId });
    else {
      board.setHold({ hand: null, aim: board.hold.aim, overKey: null, overList: false });
      if (props.action === 'cancel') window.dispatchEvent(new Event('schedule:cancel-hand'));
    }
  }} aria-label={props.action === 'cancel' ? 'Отменить перенос' : props.label} title={props.action === 'cancel' ? 'Отменить перенос' : props.label}>{props.action === 'edit' ? <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="m3 10 7-7 3 3-7 7-4 1 1-4ZM9 4l3 3" strokeLinejoin="round" /></svg> : props.label}</button>;
}
