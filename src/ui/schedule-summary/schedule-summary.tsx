import type { ScheduleCatalog } from '#schedule/types.ts';

import { useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { scheduleProgress } from '#schedule/section.progress.ts';
import { transferSummary } from './scheduleSummary.model.ts';

import styles from './schedule-summary.module.css';

export function ScheduleSummary({ catalog }: { catalog: ScheduleCatalog }) {
  const board = useBoard();
  const lessons = useSchedule((state) => state.lessons);
  const { required, placed, remaining } = scheduleProgress(catalog.sections, lessons);
  const transfer = transferSummary({ catalog, lessons, board });
  const complete = remaining === 0;

  let content = (
    <div className={styles.summary} aria-label="Прогресс составления расписания">
      <strong className={styles.count} aria-label={`Назначено ${placed} из ${required}`}>{placed} / {required}</strong>
      <progress
        className={styles.progress}
        value={placed}
        max={Math.max(required, 1)}
        aria-label="Назначенные занятия по недельному плану"
      />
      <span className={styles.remaining}>{complete ? 'План выполнен' : `Осталось ${remaining}`}</span>
    </div>
  );

  if (transfer) {
    content = (
      <div className={styles.summary} data-transfer="yes" data-tone={transfer.tone} role="status" aria-atomic="true">
        <span className={styles.code}>{transfer.code}</span>
        <div className={styles.message}>
          <strong>{transfer.title}</strong>
          <span title={transfer.detail}>{transfer.detail}</span>
        </div>
        {transfer.destination && <span className={styles.destination}>{transfer.destination}</span>}
      </div>
    );
  }

  return <div className={styles.row}>
    <strong className={styles.heading}>Занятия</strong>
    {content}
  </div>;
}
