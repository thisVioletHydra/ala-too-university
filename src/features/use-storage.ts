import { useSchedule } from '#app/schedule.store.ts';
import { readStoredSchedule, writeStoredSchedule } from '#data/schedule.storage.ts';
import { useEffect, useRef } from 'react';

export function useStorage(ready: boolean): void {
  const hydrated = useRef(false);

  useEffect(() => {
    if (!ready || hydrated.current) return;

    hydrated.current = true;
    const stored = readStoredSchedule();
    if (!stored?.dataset || stored.dataset !== useSchedule.getState().dataset) return;

    useSchedule.getState().replaceLessons(stored.lessons, stored.past, stored.future);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    return useSchedule.subscribe((state, previous) => {
      if (hydrated.current === null || hydrated.current === undefined) return;

      if (state.lessons === previous.lessons && state.past === previous.past && state.future === previous.future) {
        return;
      }

      writeStoredSchedule({
        dataset: state.dataset,
        lessons: state.lessons,
        past: state.past,
        future: state.future,
      });
    });
  }, [ready]);
}
