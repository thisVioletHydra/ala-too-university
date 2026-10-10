import type { SectionListProps } from './section-list.tsx';
import type { ListMode } from '#features/use-search.ts';

import styles from '#ui/section-list/section-list.module.css';

type Props = Pick<SectionListProps['filters'], 'counts' | 'mode' | 'onMode'>;

export function SectionListFooter({ counts, mode, onMode }: Props) {
  function handleIssueToggle(issue: ListMode): void { onMode(mode === issue ? 'not-done' : issue); }

  const excess = counts.excess;
  const noTeacher = counts['no-teacher'];

  const footer = (
    <footer className={styles.status}>
      {excess > 0 ? (
        <button className={styles.issue} type="button" aria-pressed={mode === 'excess'} onClick={() => handleIssueToggle('excess')}>
          <span>Превышена норма занятий</span><b>{excess}</b><span aria-hidden="true">→</span>
        </button>
      ) : null}
      {noTeacher > 0 && (
        <button className={styles.issue} type="button" aria-pressed={mode === 'no-teacher'} onClick={() => handleIssueToggle('no-teacher')}>
          <span>Нужен преподаватель</span><b>{noTeacher}</b><span aria-hidden="true">→</span>
        </button>
      )}
      {noTeacher === 0 && excess === 0 && <span>Все секции с преподавателем</span>}
    </footer>
  );
  return footer;
}
