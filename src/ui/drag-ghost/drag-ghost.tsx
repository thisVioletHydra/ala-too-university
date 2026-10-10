import type { ScheduleCatalog } from '#schedule/types.ts';

import { dropAnimation } from '#ui/drag-ghost/dragGhost.dropAnimation.ts';
import { firstSlotWidth } from '#ui/drag-ghost/dragGhost.geometry.ts';
import { heldCard } from '#ui/drag-ghost/dragGhost.heldCard.tsx';
import { setDragging } from '#ui/drag-ghost/dragGhost.bodyFlags.ts';
import { useHandCursor } from '#ui/drag-ghost/dragGhost.handCursor.ts';
import { useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { DragOverlay } from '@dnd-kit/core';
import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from '#ui/drag-ghost/drag-ghost.module.css';

type DragGhostProps = {
  catalog: ScheduleCatalog
};

type HandCursorProps = {
  catalog: ScheduleCatalog
};

export function DragGhost({ catalog }: DragGhostProps) {
  const board = useBoard();
  const lessons = useSchedule((state) => state.lessons);
  const remembered = useSchedule((state) => state.rememberedTeachers);
  const [width, setWidth] = useState<number | undefined>();
  const ghost = board.ghost;
  const card = ghost ? heldCard(catalog, lessons, remembered, ghost) : null;

  useLayoutEffect(() => {
    setWidth(ghost?.kind === 'section' ? firstSlotWidth() : undefined);
  }, [ghost]);

  useEffect(() => {
    if (ghost === null) return;

    setDragging(true);

    return () => setDragging(false);
  }, [ghost]);

  return (
    <DragOverlay dropAnimation={dropAnimation} zIndex={30}>
      {card ? <div className={styles.preview} style={{ width }}>{card}</div> : null}
    </DragOverlay>
  );
}

export function HandCursor({ catalog }: HandCursorProps) {
  const { node, content } = useHandCursor(catalog);
  if (content === null || content === undefined) return null;

  return createPortal(<div ref={node} className={styles.float}>{content}</div>, document.body);
}
