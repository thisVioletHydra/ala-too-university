import { ReaderStatus } from '#accessible/reader.status.tsx';
import { useStorage } from '#features/use-storage.ts';
import { Status } from '#ui/status/status.tsx';
import { Providers } from './providers.tsx';
import { useScheduleSession } from './schedule.session.ts';
import { Workspace } from './workspace.tsx';

export default function App() {
  const { session, retry, selectDataset } = useScheduleSession();
  useStorage(session.status === 'ready');

  if (session.status !== 'ready') {
    const message = session.status === 'error' ? session.message : 'Загрузка расписания';

    return <Status kind={session.status} message={message} onRetry={retry} />;
  }

  return (
    <Providers catalog={session.catalog}>
      <ReaderStatus />
      <Workspace catalog={session.catalog} dataset={session.dataset} onDataset={selectDataset} />
    </Providers>
  );
}
