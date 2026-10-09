import type { ListMode } from '#features/use-search.ts';
import type { Lesson, Section } from '#schedule/types.ts';

import { useDroppable } from '@dnd-kit/core';
import { useBoard } from '#app/providers.tsx';
import { SectionCard } from '#ui/section-card/section-card.tsx';

import styles from '#ui/section-list/section-list.module.css';

type SectionListProps = {
  sections: Section[]
  lessons: Lesson[]
  courseName: (section: Section) => string
  courseCode: (section: Section) => string
  teacherName: (section: Section) => string | null
  highlighted: (section: Section) => boolean
  query: string
  counts: Record<ListMode, number>
  onQuery: (query: string) => void
  listIndex: number
  onEnter: () => void
  onGrab: (sectionId: string, index: number) => void
  onPoint: () => void
  onDrop: () => void
};

export function SectionList(props: SectionListProps) {
  const board = useBoard();
  const unassign = useDroppable({ id: 'unassign', data: { kind: 'unassign' } });

  return (
    <aside
      ref={unassign.setNodeRef}
      className={styles.panel}
      onPointerOver={() => props.onPoint()}
      onClick={(event) => {
        if (board.hold.hand?.kind !== 'lesson') return;

        if (!(event.target instanceof Element)) return;

        if (event.target.closest('button, input')) return;

        props.onDrop();
      }}
    >
      <header className={styles.head}>
        <h1 className={styles.title}>Секции</h1>
        <span className={styles.total} title="Секций в выборке">{props.counts.all}</span>
      </header>
      <div className={styles.find}>
        <label className={styles.searchLabel} htmlFor="section-search">Поиск</label>
        <span className={styles.searchField}>
          <svg className={styles.searchIcon} viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10.5 10.5 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            id="section-search"
            className={styles.search}
            value={props.query}
            placeholder="Название или код"
            onChange={(event) => props.onQuery(event.target.value)}
          />
          {props.query.length > 0
            ? (
              <button
                type="button"
                className={styles.clear}
                aria-label="Очистить поиск"
                onClick={() => props.onQuery('')}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )
            : null}
        </span>
      </div>
      <div className={styles.tray} data-tray data-over={board.overUnassign ? 'yes' : 'no'}>
        <div
          className={styles.list}
          data-keyboard-zone="list"
          tabIndex={props.sections.length === 0 || board.hold.aim === 'list:return' ? 0 : -1}
          data-aim={board.hold.aim === 'list:return' || (props.sections.length === 0 && board.hold.aim.startsWith('list:')) ? 'yes' : 'no'}
          onFocus={props.onEnter}
        >
          {props.sections.length === 0
            ? (
              <p className={styles.empty}>
                <span className={styles.emptyTitle}>Ничего не найдено</span>
                <span className={styles.emptyHint}>Измените запрос или выберите другого преподавателя</span>
              </p>
            )
            : null}
          {props.sections.map((section, index) => (
            <SectionCard
              key={section.id}
              section={section}
              courseName={props.courseName(section)}
              courseCode={props.courseCode(section)}
              teacherName={props.teacherName(section)}
              lessons={props.lessons}
              highlighted={props.highlighted(section)}
              index={index}
              tabStop={index === props.listIndex}
              onGrab={() => props.onGrab(section.id, index)}
            />
          ))}
        </div>
        {board.overUnassign
          ? (
            <p className={styles.hint}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M8 3v7m0 0 3-3m-3 3L5 7M3 13h10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Вернуть в нераспределённые
            </p>
          )
          : null}
      </div>
      <footer className={styles.status}>
        <span className={styles.stat}>
          Не распределено
          <b>{props.counts['not-done']}</b>
          <span className={styles.of}>из {props.counts.all}</span>
        </span>
        <span className={styles.stat} data-tone={props.counts['no-teacher'] > 0 ? 'warn' : 'calm'}>
          без преподавателя
          <b>{props.counts['no-teacher']}</b>
        </span>
      </footer>
    </aside>
  );
}
