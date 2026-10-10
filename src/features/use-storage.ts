import { useSchedule } from '#app/schedule.store.ts';
import { writeStoredSchedule } from '#data/schedule.storage.ts';
import { useEffect } from 'react';

export function useStorage(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;

    return useSchedule.subscribe((state, previous) => {
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
