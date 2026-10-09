import type { ScheduleCatalog } from '#schedule/types.ts';
import type { Dataset } from '#app/schedule.store.ts';

import { Providers } from '#app/providers.tsx';
import { Workspace } from '#app/workspace.tsx';
import { loadSchedule } from '#data/schedule.parser.ts';
import { readStoredSchedule } from '#data/schedule.storage.ts';
import { useSchedule } from '#app/schedule.store.ts';
import { useStorage } from '#features/use-storage.ts';
import { withManySections } from '#data/withManySections.ts';
import { Status } from '#ui/status/status.tsx';
import { useEffect, useState } from 'react';

export default function App() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [message, setMessage] = useState('Не удалось загрузить расписание');
  const [catalog, setCatalog] = useState<ScheduleCatalog | null>(null);
  const [mock, setMock] = useState<ScheduleCatalog | null>(null);
  const [dataset, setDataset] = useState<Dataset>('mock');
  const ready = status === 'ready' && catalog !== null;

  function apply(base: ScheduleCatalog, mode: Dataset): void {
    const next = mode === 'bulk' ? withManySections(base, 500) : base;
    useSchedule.getState().setDataset(mode);
    useSchedule.getState().setCatalog(next);
    useSchedule.getState().replaceLessons(next.lessons);
    setDataset(mode);
    setCatalog(next);
  }

  function load(fail: boolean): void {
    setStatus('loading');
    loadSchedule({ fail }).then((next) => {
      setMock(next);
      apply(next, 'mock');
      setStatus('ready');
    }).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить расписание');
      setStatus('error');
    });
  }

  useEffect(() => {
    let active = true;
    const fail = new URLSearchParams(location.search).has('fail');
    setStatus('loading');
    loadSchedule({ fail }).then((next) => {
      if (!active) return;

      const stored = readStoredSchedule();
      const mode = stored?.dataset === 'bulk' ? 'bulk' : 'mock';
      setMock(next);
      apply(next, mode);
      if (stored?.dataset === mode) {
        useSchedule.getState().replaceLessons(stored.lessons, stored.past, stored.future);
      }

      setStatus('ready');
    }).catch((error: unknown) => {
      if (!active) return;

      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить расписание');
      setStatus('error');
    });
    return () => {
      active = false;
    };
  }, []);

  useStorage(ready);

  if (!ready || !catalog) {
    return (
      <Status
        kind={status === 'error' ? 'error' : 'loading'}
        message={message}
        onRetry={() => {
          history.replaceState(null, '', location.pathname);
          load(false);
        }}
      />
    );
  }

  return (
    <Providers catalog={catalog}>
      <Workspace
        catalog={catalog}
        dataset={dataset}
        onDataset={(mode) => {
          if (mock) apply(mock, mode);
        }}
      />
    </Providers>
  );
}
