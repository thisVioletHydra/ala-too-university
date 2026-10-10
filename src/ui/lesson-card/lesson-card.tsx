import type { MouseEvent } from 'react';
import type { RoomType } from '#schedule/types.ts';

import { needsTeacher } from '#ui/teacher-label.ts';
import { LessonFaceBody } from './lessonCard.body.tsx';
import { SourcePlaceholder, LessonEditButton } from '#ui/lesson-card/lessonCard.actions.tsx';
import { dataAttribute } from '#ui/data-attribute.ts';
import { useBoard } from '#app/providers.tsx';
import { useDraggable } from '@dnd-kit/core';

import styles from '#ui/lesson-card/lesson-card.module.css';

export type LessonFields = {
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
  sourceActions?: 'all' | 'edit'
  onGrab: () => void
  onDrop: () => void
};

type LessonFaceProps = LessonFields & {
  lessonId?: string
  highlighted: boolean
  dimmed?: boolean
  compact?: boolean
  listView?: boolean
  sourceActions?: 'all' | 'edit'
  overlay: boolean
  held: boolean
  nodeRef?: (element: HTMLElement | null) => void
  listeners?: ReturnType<typeof useDraggable>['listeners']
  attributes?: ReturnType<typeof useDraggable>['attributes']
  onGrab?: () => void
  onDrop?: () => void
  onPress?: (event: MouseEvent<HTMLButtonElement>) => void
};

type CardAttributesInput = {
  courseId: string
  teacherName: string
  highlighted: boolean
  dimmed?: boolean
  compact?: boolean
  listView?: boolean
  overlay: boolean
  held: boolean
  flashed: boolean
};

function cardAttributes(input: CardAttributesInput): Record<string, string> {
  return {
    'data-compact': dataAttribute(input.compact),
    'data-list-view': dataAttribute(input.listView),
    'data-needs-teacher': dataAttribute(needsTeacher(input.teacherName)),
    'data-course': input.courseId,
    'data-highlighted': dataAttribute(input.highlighted),
    'data-dimmed': dataAttribute(input.dimmed),
    'data-overlay': dataAttribute(input.overlay),
    'data-held': dataAttribute(input.held),
    'data-flash': dataAttribute(input.flashed),
  };
}

export function LessonCard({ lessonId, dimmed, onGrab, onDrop, ...fields }: LessonCardProps) {
  const board = useBoard();
  const landing = board.landing?.kind === 'card' && board.landing.lessonId === lessonId;
  const ghostPicked = board.ghost?.kind === 'lesson'
    && board.repeat === false
    && board.ghost.copy === false
    && board.ghost.lessonId === lessonId;
  const handPicked = board.repeat === false
    && board.hold.hand?.kind === 'lesson'
    && board.hold.hand.lessonId === lessonId;
  const picked = landing || (board.ghost?.kind === 'lesson' ? ghostPicked : handPicked);
  const busy = board.ghost !== null || board.hold.hand !== null;
  const drag = useDraggable({
    id: `lesson:${lessonId}`,
    data: { kind: 'lesson', lessonId },
    disabled: busy && picked === false,
  });

  function handleGrab(): void {
    if (board.skipClick() || board.ghost || board.hold.hand) return;

    onGrab();
  }

  function handlePress(event: MouseEvent<HTMLButtonElement>): void {
    if (board.skipClick() || board.ghost) return;

    if (board.hold.hand) {
      event.stopPropagation();
      onDrop();

      return;
    }

    onGrab();
  }

  return (
    <LessonFace
      {...fields}
      lessonId={lessonId}
      dimmed={picked === false && Boolean(dimmed)}
      overlay={false}
      held={picked}
      nodeRef={drag.setNodeRef}
      listeners={drag.listeners}
      attributes={drag.attributes}
      onGrab={handleGrab}
      onPress={handlePress}
    />
  );
}

export function LessonPreview(fields: LessonFields) {
  return <LessonFace {...fields} highlighted={false} overlay held={false} />;
}

function LessonFace({ courseId, courseCode, courseName, code, teacherName, roomName, roomType, highlighted, dimmed, compact, listView, sourceActions = 'all', overlay, held, lessonId, nodeRef, listeners, attributes, onPress, }: LessonFaceProps) {
  const board = useBoard();
  const flashed = lessonId !== undefined && board.flash.lessonId === lessonId;
  const carried = board.ghost ?? board.hold.hand;
  const dragging = board.repeat === false && carried?.kind === 'lesson' && carried.lessonId === lessonId;
  const actions = Boolean(lessonId) && overlay === false && dragging;
  const sourceId = lessonId ?? null;
  const canEdit = sourceId !== null && carried === null && held === false;
  const shared = cardAttributes({
    courseId,
    teacherName,
    highlighted,
    dimmed,
    compact,
    listView,
    overlay,
    held,
    flashed,
  });

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    if (event.detail === 0) return;

    onPress?.(event);
  }


  if (overlay) {
    return <div className={styles.card} {...shared}><LessonFaceBody courseCode={courseCode} courseName={courseName} code={code} teacherName={teacherName} roomName={roomName} roomType={roomType} /></div>;
  }

  return (
    <div
      className={styles.wrap}
      data-held={dataAttribute(held)}
      data-actions={dataAttribute(actions)}
      data-dimmed={dataAttribute(dimmed)}
    >
      <button
        type="button"
        className={styles.card}
        ref={nodeRef}
        {...shared}
        {...listeners}
        {...attributes}
        data-lesson-id={lessonId}
        title={`${courseName} · ${code} · ${teacherName} · ${roomName}`}
        tabIndex={-1}
        onClick={handleClick}
      >
        <LessonFaceBody courseCode={courseCode} courseName={courseName} code={code} teacherName={teacherName} roomName={roomName} roomType={roomType} />
      </button>
      {canEdit && sourceId && <LessonEditButton lessonId={sourceId} code={code} />}
      {actions && sourceId ? <SourcePlaceholder lessonId={sourceId} code={code} editOnly={sourceActions === 'edit'} /> : null}
    </div>
  );
}
