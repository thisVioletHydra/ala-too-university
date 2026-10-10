import type { ReactNode } from 'react';
import type { SectionListProps } from './section-list.tsx';

import { Select } from '#ui/select/select.tsx';
import { GROUP_BY_ICONS, groupByLabel, groupByTitle, MODE_TABS, MODE_TITLES, nextGroupBy, teacherOptions } from '#ui/section-list/sectionList.model.tsx';

import styles from '#ui/section-list/section-list.module.css';

type Props = { children: ReactNode; filters: SectionListProps['filters'] };

export function SectionListHeader({ children, filters }: Props) {
  const { groupBy, onGroupBy, sectionTeacherId, onSectionTeacher, teachers, mode, onMode, query, counts, onQuery } = filters;
  function handleGroupByClick(): void { onGroupBy(nextGroupBy(groupBy)); }

  function handleQueryClear(): void { onQuery(''); }

  const header = (
    <header className={styles.head}>
      <h1 className={styles.title}>Секции</h1>
      <div className={styles.tabs} data-mode={mode} aria-label="Количество секций по статусу">
        {MODE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={mode === tab.id}
            title={`${tab.label}: ${counts[tab.id]} секций`}
            aria-label={`${tab.label}: ${counts[tab.id]} секций`}
            onClick={() => onMode(tab.id)}
          >
            {tab.label}
            <span>{counts[tab.id]}</span>
          </button>
        ))}
      </div>
    </header>
  );

  const search = (
    <div className={styles.find}>
      <span className={styles.searchField}>
        <svg className={styles.searchIcon} viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10.5 10.5 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          id="section-search"
          className={styles.search}
          value={query}
          aria-label="Поиск секций по названию или коду"
          placeholder="Поиск по названию или коду"
          onChange={(event) => onQuery(event.target.value)}
        />
        {query.length > 0 ? (
          <button type="button" className={styles.clear} aria-label="Очистить поиск" onClick={handleQueryClear}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </span>
    </div>
  );

  const viewHead = (
    <div className={styles.viewHead}>
      <h2>{MODE_TITLES[mode]}</h2>
      <button type="button" aria-label={groupByLabel(groupBy)} title={groupByTitle(groupBy)} onClick={handleGroupByClick}>
        <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          {GROUP_BY_ICONS[groupBy]}
        </svg>
      </button>
    </div>
  );

  const teacherFilter = groupBy === 'teacher' && (
    <Select
      label="Секции преподавателя"
      value={sectionTeacherId}
      onChange={onSectionTeacher}
      options={teacherOptions(teachers)}
    />
  );
  return <>{header}<div className={styles.content}>{search}{viewHead}{teacherFilter}{children}</div></>;
}
