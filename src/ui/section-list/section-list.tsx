import type { ListMode } from '#features/use-search.ts';
import type { Lesson, Section } from '#schedule/types.ts';

import { useDroppable } from '@dnd-kit/core';
import { useBoard } from '#app/providers.tsx';
import { SectionCard } from '#ui/section-card/section-card.tsx';
import { Fragment } from 'react';

import styles from '#ui/section-list/section-list.module.css';

type SectionListProps = {
  hidden: boolean
  sections: Section[]
  lessons: Lesson[]
  courseName: (section: Section) => string
  courseCode: (section: Section) => string
  teacherName: (section: Section) => string | null
  highlighted: (section: Section) => boolean
  filtering: boolean
  mode: ListMode
  onMode: (mode: ListMode) => void
  query: string
  counts: Record<ListMode, number>
  onQuery: (query: string) => void
  listIndex: number
  onEnter: () => void
  onGrab: (sectionId: string, index: number) => void
  onPoint: () => void
  onLeave: () => void
  onDrop: () => void
};

export function SectionList(props: SectionListProps) {
  const board = useBoard();
  const unassign = useDroppable({ id: 'unassign', data: { kind: 'unassign' } });

  return (
    <aside
      id="sections-panel"
      aria-hidden={props.hidden || undefined}
      ref={unassign.setNodeRef}
      className={styles.panel}
      onPointerOver={() => props.onPoint()}
      onPointerLeave={props.onLeave}
      onClick={(event) => {
        if (!board.hold.hand || board.skipClick()) return;

        if (!(event.target instanceof Element)) return;

        if (event.target.closest('button, input')) return;

        props.onDrop();
      }}
    >
      <header className={styles.head}>
        <h1 className={styles.title}>Секции</h1>
        <div className={styles.tabs} aria-label="Количество секций по статусу">
          {([{ id: 'not-done', label: 'Осталось' }, { id: 'done', label: 'Готово' }, { id: 'all', label: 'Все' }] as const).map((tab) => <button key={tab.id} type="button" aria-pressed={props.mode === tab.id} title={`${tab.label}: ${props.counts[tab.id]} секций`} aria-label={`${tab.label}: ${props.counts[tab.id]} секций`} onClick={() => props.onMode(tab.id)}>{tab.label}<span>{props.counts[tab.id]}</span></button>)}
        </div>
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
          data-section-scroll
          data-keyboard-zone="list"
          tabIndex={props.sections.length === 0 || board.hold.aim === 'list:return' ? 0 : -1}
          data-aim={board.hold.aim === 'list:return' || (props.sections.length === 0 && board.hold.aim.startsWith('list:')) ? 'yes' : 'no'}
          onFocus={(event) => {
            if (event.target.matches(':focus-visible')) props.onEnter();
          }}
        >
          {props.sections.length === 0
            ? (
              <p className={styles.empty}>
                <span className={styles.emptyTitle}>{props.query ? 'Ничего не найдено' : props.mode === 'no-teacher' ? 'Все секции с преподавателем' : props.mode === 'done' ? 'Пока нет готовых секций' : 'Все секции распределены'}</span>
                <span className={styles.emptyHint}>{props.query ? 'Попробуйте другой запрос' : 'Выберите вкладку «Все», чтобы увидеть весь список'}</span>
              </p>
            )
            : null}
          {props.sections.map((section, index) => (
            <Fragment key={section.id}>
              {props.sections[index - 1]?.courseId !== section.courseId ? <div className={styles.group} data-section-group role="heading" aria-level={2} data-course={section.courseId}><span>{props.courseName(section)}<small>Преподавателей: {new Set(props.sections.filter((item) => item.courseId === section.courseId).map(props.teacherName).filter(Boolean)).size}</small></span><small>{props.courseCode(section)}</small></div> : null}
            <SectionCard
              key={section.id}
              section={section}
              courseName={props.courseName(section)}
              courseCode={props.courseCode(section)}
              teacherName={props.teacherName(section)}
              lessons={props.lessons}
              highlighted={false}
              dimmed={props.filtering && !props.highlighted(section)}
              index={index}
              tabStop={index === props.listIndex}
              onGrab={() => props.onGrab(section.id, index)}
            />
            </Fragment>
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
              {board.hold.hand?.kind === 'section' || board.ghost?.kind === 'section' ? 'Вернуть секцию · Отменить перенос' : 'Вернуть в нераспределённые'}
            </p>
          )
          : null}
      </div>
      <footer className={styles.status}>
        {props.counts['no-teacher'] > 0 ? <button className={styles.issue} type="button" aria-pressed={props.mode === 'no-teacher'} onClick={() => props.onMode(props.mode === 'no-teacher' ? 'not-done' : 'no-teacher')}>
          <span>Нужен преподаватель</span><b>{props.counts['no-teacher']}</b><span aria-hidden="true">→</span>
        </button> : <span>Все секции с преподавателем</span>}
      </footer>
    </aside>
  );
}
