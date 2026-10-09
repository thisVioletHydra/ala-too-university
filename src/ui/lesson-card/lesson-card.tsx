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

function RoomMark() {
  return (
    <span className={styles.warn} title="Поставлено не в предпочтительный тип аудитории">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path fill="currentColor" d="M8 1.4 15 14.2H1L8 1.4Z" />
        <path fill="#fff" d="M7.25 6.2h1.5V10H7.25V6.2Zm0 4.7h1.5v1.5H7.25v-1.5Z" />
      </svg>
      <span className={styles.sr}>Поставлено не в предпочтительный тип аудитории</span>
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
      <span className={styles.top}>
        <span className={styles.tag}>{props.courseCode}</span>
        <span className={styles.no}>{sectionNo(props.courseCode, props.code)}</span>
      </span>
      <span className={styles.name}>{props.courseName}</span>
      <span className={styles.who}>{props.teacherName}</span>
      <span className={styles.room} data-warn={otherRoom ? 'yes' : 'no'}>
        {props.roomName}
        {otherRoom ? <RoomMark /> : null}
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
