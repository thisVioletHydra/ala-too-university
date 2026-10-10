import type { MouseEvent, ReactNode } from 'react';

import { dataAttribute } from '#ui/data-attribute.ts';
import { requestCancelHand } from '#ui/hand-events.ts';
import { useBoard } from '#app/providers.tsx';
import { useDroppable } from '@dnd-kit/core';

import styles from '#ui/lesson-card/lesson-card.module.css';

type CardActionKind = 'edit' | 'cancel';

type CardActionProps = {
  lessonId: string
  action: 'cancel'
  label: string
};

type SourcePlaceholderProps = {
  lessonId: string
  code: string
  strip?: boolean
};

const CANCEL_LABEL = 'Отменить перенос';

const SOURCE_PLACEHOLDER_LABEL = 'Исходное место';

const ACTION_ICONS: Record<CardActionKind, ReactNode> = {
  edit: (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="m3 10 7-7 3 3-7 7-4 1 1-4ZM9 4l3 3" strokeLinejoin="round" />
    </svg>
  ),
  cancel: null,
};

export function SourcePlaceholder({ lessonId, code, strip }: SourcePlaceholderProps) {
  function handleContainerClick(event: MouseEvent<HTMLDivElement>): void {
    event.stopPropagation();
  }

  return (
    <div className={styles.actions} data-strip={dataAttribute(strip)} onClick={handleContainerClick}>
      <CardAction lessonId={lessonId} action="cancel" label={strip ? code : SOURCE_PLACEHOLDER_LABEL} />
    </div>
  );
}

function CardAction({ lessonId, action, label }: CardActionProps) {
  const board = useBoard();
  const { setNodeRef, isOver } = useDroppable({
    id: `card-action:${lessonId}:${action}`,
    data: { kind: 'card-action', lessonId, action },
  });
  const accessibleLabel = CANCEL_LABEL;

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    if (board.skipClick()) return;

    board.setHold({ hand: null, aim: board.hold.aim, overKey: null, overList: false });
    requestCancelHand();
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={styles.action}
      data-action={action}
      data-over={dataAttribute(isOver)}
      onClick={handleClick}
      aria-label={accessibleLabel}
      title={accessibleLabel}
    >
      {ACTION_ICONS[action] ?? label}
    </button>
  );
}

export function LessonEditButton({ lessonId, code }: { lessonId: string; code: string }) {
  const board = useBoard();
  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    if (board.skipClick() || board.ghost || board.hold.hand) return;

    board.setEditor({ mode: 'edit', lessonId });
  }

  return <button
    type="button"
    className={styles.editButton}
    tabIndex={-1}
    aria-label={`Редактировать занятие ${code}`}
    title="Редактировать занятие"
    onPointerDown={(event) => event.stopPropagation()}
    onClick={handleClick}
  >
    {ACTION_ICONS.edit}
  </button>;
}
