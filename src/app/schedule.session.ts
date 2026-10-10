import type { ScheduleCatalog } from '#schedule/types.ts';
import type { StoredSchedule } from '#data/schedule.storage.ts';
import type { Dataset } from './schedule.store.ts';

import { loadSchedule } from '#data/schedule.parser.ts';
import { readStoredSchedule } from '#data/schedule.storage.ts';
import { withManySections } from '#data/withManySections.ts';
import { useEffect, useState } from 'react';
import { useSchedule } from './schedule.store.ts';

type Session =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; base: ScheduleCatalog; catalog: ScheduleCatalog; dataset: Dataset };

export function applyDataset(base: ScheduleCatalog, dataset: Dataset, saved: StoredSchedule | null = null): ScheduleCatalog {
  const catalog = dataset === 'bulk' ? withManySections(base, 500) : base;
  const canRestore = saved?.dataset === dataset;
  useSchedule.setState({
    catalog,
    dataset,
    lessons: canRestore ? saved.lessons : catalog.lessons,
    past: canRestore ? saved.past : [],
    future: canRestore ? saved.future : [],
  });
  return catalog;
}

export function useScheduleSession() {
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const fail = new URLSearchParams(location.search).has('fail');
    loadSchedule({ fail }).then((base) => {
      if (!active) return;

      const saved = readStoredSchedule();
      const dataset = saved?.dataset === 'bulk' ? 'bulk' : 'mock';
      const catalog = applyDataset(base, dataset, saved);
      setSession({ status: 'ready', base, catalog, dataset });
    }).catch((error: unknown) => {
      if (!active) return;

      const message = error instanceof Error ? error.message : 'Не удалось загрузить расписание';
      setSession({ status: 'error', message });
    });
    return () => { active = false; };
  }, [attempt]);

  function retry(): void {
    history.replaceState(null, '', location.pathname);
    setSession({ status: 'loading' });
    setAttempt((current) => current + 1);
  }

  function selectDataset(dataset: Dataset): void {
    if (session.status !== 'ready') return;

    const catalog = applyDataset(session.base, dataset);
    setSession({ ...session, catalog, dataset });
  }

  return { session, retry, selectDataset };
}
