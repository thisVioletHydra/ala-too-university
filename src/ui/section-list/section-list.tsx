import type { ListMode } from '#features/use-search.ts';
import type { Lesson, Section, Teacher } from '#schedule/types.ts';

import { sectionRows } from '#features/section-groups.ts';
import { Select } from '#ui/select/select.tsx';
import { useDroppable } from '@dnd-kit/core';
import { useBoard } from '#app/providers.tsx';
import { SectionCard } from '#ui/section-card/section-card.tsx';
import { Fragment } from 'react';

import styles from '#ui/section-list/section-list.module.css';

type SectionListProps = {
  groupBy: 'course' | 'teacher'
  onGroupBy: (value: 'course' | 'teacher') => void
  sectionTeacherId: string
  onSectionTeacher: (value: string) => void
  teachers: Teacher[]
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
  const rows = sectionRows(props);
  const unassign = useDroppable({ id: 'unassign', data: { kind: 'unassign' } });
  const titles: Record<ListMode, string> = { all: 'Все секции', 'not-done': 'Осталось распределить', done: 'Готовые секции', 'no-teacher': 'Нужен преподаватель', excess: 'Дополнительные занятия' };

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
        <div className={styles.tabs} data-mode={props.mode} aria-label="Количество секций по статусу">
          {([{ id: 'not-done', label: 'Осталось' }, { id: 'done', label: 'Готово' }, { id: 'all', label: 'Все' }] as const).map((tab) => <button key={tab.id} type="button" aria-pressed={props.mode === tab.id} title={`${tab.label}: ${props.counts[tab.id]} секций`} aria-label={`${tab.label}: ${props.counts[tab.id]} секций`} onClick={() => props.onMode(tab.id)}>{tab.label}<span>{props.counts[tab.id]}</span></button>)}
        </div>
      </header>
      <div className={styles.content}>
      <div className={styles.find}>
        <span className={styles.searchField}>
          <svg className={styles.searchIcon} viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10.5 10.5 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            id="section-search"
            className={styles.search}
            value={props.query}
            aria-label="Поиск секций по названию или коду"
            placeholder="Поиск по названию или коду"
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
      <div className={styles.viewHead}>
        <h2>{titles[props.mode]}</h2>
        <button type="button" aria-label={props.groupBy === 'course' ? 'Группировать по преподавателям' : 'Группировать по дисциплинам'} title={props.groupBy === 'course' ? 'По дисциплинам · переключить на преподавателей' : 'По преподавателям · переключить на дисциплины'} onClick={() => props.onGroupBy(props.groupBy === 'course' ? 'teacher' : 'course')}>
          <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">{props.groupBy === 'teacher' ? <><circle cx="10" cy="6" r="3" /><path d="M4 17v-2a6 6 0 0 1 12 0v2" /></> : <><rect x="3" y="3" width="14" height="14" rx="2" /><path d="M7 3v14M10 7h4M10 11h4" /></>}</svg>
        </button>
      </div>
      {props.groupBy === 'teacher' ? <Select label="Секции преподавателя" value={props.sectionTeacherId} onChange={props.onSectionTeacher} options={[{ value: '', label: 'Все преподаватели' }, ...props.teachers.map((teacher) => ({ value: teacher.id, label: teacher.shortName }))]} /> : null}
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
          {rows.map(({ section, index, first, last, heading }) => (
            <Fragment key={section.id}>
              {heading ? (
                <div className={styles.group} data-section-group role="heading" aria-level={2} data-course={section.courseId}>
                  <span>{heading.title}<small>{heading.detail}</small></span>
                  {heading.code ? <small>{heading.code}</small> : null}
                </div>
              ) : null}
              <div className={styles.linkedCard} data-first={first ? 'yes' : 'no'} data-last={last ? 'yes' : 'no'}>
            <span className={styles.groupDot} aria-hidden="true" />
            <SectionCard
              key={section.id}
              section={section}
              showCourse={props.groupBy === 'teacher'}
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
            </div>
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
        {props.counts.excess > 0 ? <button className={styles.issue} type="button" aria-pressed={props.mode === 'excess'} onClick={() => props.onMode(props.mode === 'excess' ? 'not-done' : 'excess')}>
          <span>Превышена норма занятий</span><b>{props.counts.excess}</b><span aria-hidden="true">→</span>
        </button> : null}
        {props.counts['no-teacher'] > 0 ? <button className={styles.issue} type="button" aria-pressed={props.mode === 'no-teacher'} onClick={() => props.onMode(props.mode === 'no-teacher' ? 'not-done' : 'no-teacher')}>
          <span>Нужен преподаватель</span><b>{props.counts['no-teacher']}</b><span aria-hidden="true">→</span>
        </button> : props.counts.excess === 0 ? <span>Все секции с преподавателем</span> : null}
      </footer>
      </div>
    </aside>
  );
}
