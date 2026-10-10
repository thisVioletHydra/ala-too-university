import type { ScheduleCatalog } from '#schedule/types.ts';
import type { ReactNode } from 'react';

import { DndContext, pointerWithin } from '@dnd-kit/core';
import { createContext, useContext } from 'react';
import { useBoardController } from './board.controller.ts';

export type { EditorRequest, ActiveDrag, DragFace, Hand, Hold, DropTarget, Landing, Flash } from '#interaction/types.ts';
export { slotKey } from '#interaction/slot.key.ts';

type BoardContextValue = ReturnType<typeof useBoardController>['value'];
const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoard(): BoardContextValue {
  const value = useContext(BoardContext);
  if (value === null || value === undefined) throw new Error('Нет доски');

  return value;
}

const boardCollisions: typeof pointerWithin = (args) => {
  const hits = pointerWithin(args);
  const action = hits.find((hit) => String(hit.id).startsWith('card-action:'));
  return action ? [action] : hits;
};

export function Providers({ catalog, children }: { catalog: ScheduleCatalog; children: ReactNode }) {
  const { value, dnd } = useBoardController(catalog);
  return (
    <BoardContext.Provider value={value}>
      <DndContext {...dnd} collisionDetection={boardCollisions}>{children}</DndContext>
    </BoardContext.Provider>
  );
}
