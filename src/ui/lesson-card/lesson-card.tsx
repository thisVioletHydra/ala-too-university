import type { RoomType } from '#schedule/types.ts';

import { useDraggable } from '@dnd-kit/core';
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

type LessonCardProps = LessonFields & {
  lessonId: string
  sectionId: string
  highlighted: boolean
  onGrab: () => void
  onDrop: () => void
};

export function LessonCard(props: LessonCardProps) {
  const board = useBoard();
  const picked = board.ghost?.kind === 'lesson'
    ? board.ghost.lessonId === props.lessonId
    : board.hold.hand?.kind === 'lesson' && board.hold.hand.lessonId === props.lessonId;
  const busy = board.ghost !== null || board.hold.hand !== null;
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `lesson:${props.lessonId}`,
    data: { kind: 'lesson', lessonId: props.lessonId },
    disabled: busy && !picked,
  });

  return (
    <LessonFace
      {...props}
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

const roomWarning = 'Аудитория не того типа, который предпочтителен для этой секции';

function RoomMark() {
  return (
    <span className={styles.warn} title={roomWarning}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M7.3 4.4h1.4v4.6H7.3zM7.3 10.4h1.4v1.4H7.3z" />
      </svg>
      <span className={styles.sr}>{roomWarning}</span>
    </span>
  );
}

function sectionNo(courseCode: string, code: string): string {
  const prefix = `${courseCode}-`;
  if (courseCode.length > 0 && code.startsWith(prefix)) return code.slice(prefix.length);

  return code;
}

type LessonFaceProps = LessonFields & {
  lessonId?: string
  highlighted: boolean
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
  const flash = useBoard().flash;
  const otherRoom = props.roomType !== props.preferredRoomType;
  const flashed = props.lessonId !== undefined && flash.lessonId === props.lessonId;
  const body = (
    <>
      <span className={styles.rail} aria-hidden="true" />
      <span className={styles.head}>
        <span className={styles.chip}>{props.courseCode}</span>
        <span className={styles.no}>{sectionNo(props.courseCode, props.code)}</span>
      </span>
      <span className={styles.name}>{props.courseName}</span>
      <span className={styles.foot}>
        <span className={styles.who}>{props.teacherName}</span>
        <span
          className={styles.room}
          data-warn={otherRoom ? 'yes' : 'no'}
          title={otherRoom ? roomWarning : undefined}
        >
          {props.roomName}
          {otherRoom ? <RoomMark /> : null}
        </span>
      </span>
    </>
  );
  const shared = {
    className: styles.card,
    'data-course': props.courseId,
    'data-highlighted': props.highlighted ? 'yes' : 'no',
    'data-overlay': props.overlay ? 'yes' : 'no',
    'data-held': props.held ? 'yes' : 'no',
    'data-flash': flashed ? 'yes' : 'no',
  };

  if (props.overlay) {
    return <div {...shared}>{body}</div>;
  }

  return (
    <button
      type="button"
      ref={props.nodeRef}
      {...shared}
      {...props.listeners}
      {...props.attributes}
      data-lesson-id={props.lessonId}
      tabIndex={-1}
      onClick={(event) => {
        if (event.detail === 0) return;

        props.onPress?.(event);
      }}
    >
      {body}
    </button>
  );
}
