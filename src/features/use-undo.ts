import { useSchedule } from '#app/schedule.store.ts';

export function useUndo() {
  const undo = useSchedule((state) => state.undo);
  const redo = useSchedule((state) => state.redo);
  const canUndo = useSchedule((state) => state.past.length > 0);
  const canRedo = useSchedule((state) => state.future.length > 0);

  return { undo, redo, canUndo, canRedo };
}
