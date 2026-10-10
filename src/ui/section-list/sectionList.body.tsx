import type { SectionListProps } from './section-list.tsx';

import { sectionRows } from '#features/section-groups.ts';
import { SectionCard } from '#ui/section-card/section-card.tsx';
import { dataAttribute } from '#ui/data-attribute.ts';
import { dropHintText, emptyHint, emptyTitle, listAimActive, listTabIndex } from '#ui/section-list/sectionList.model.tsx';
import { useBoard } from '#app/providers.tsx';
import { Fragment } from 'react';

import styles from '#ui/section-list/section-list.module.css';

type Props = Pick<SectionListProps, 'filters' | 'content' | 'navigation'>;

export function SectionListBody({ filters, content, navigation }: Props) {
  const { groupBy, query, mode } = filters;
  const { sections, lessons, teacherName, courseName, courseCode, filtering, highlighted } = content;
  const { listIndex, onGrab, onEnter } = navigation;
  const board = useBoard();
  const rows = sectionRows({ sections, groupBy, teacherName, courseName, courseCode });
  const empty = sections.length === 0;
  function handleListFocus(event: React.FocusEvent<HTMLDivElement>): void {
    if (event.target.matches(':focus-visible')) onEnter();
  }

  const emptyContent = (
    <p className={styles.empty}>
      <span className={styles.emptyTitle}>{emptyTitle(query, mode)}</span>
      <span className={styles.emptyHint}>{emptyHint(query)}</span>
    </p>
  );

  const rowCards = rows.map(({ section, index, first, last, heading }) => (
    <Fragment key={section.id}>
      {heading ? (
        <div className={styles.group} data-section-group role="heading" aria-level={2} data-course={section.courseId}>
          <span>{heading.title}<small>{heading.detail}</small></span>
          {heading.code ? <small>{heading.code}</small> : null}
        </div>
      ) : null}
      <div className={styles.linkedCard} data-first={dataAttribute(first)} data-last={dataAttribute(last)}>
        <span className={styles.groupDot} aria-hidden="true" />
        <SectionCard
          section={section}
          showCourse={groupBy === 'teacher'}
          courseName={courseName(section)}
          courseCode={courseCode(section)}
          teacherName={teacherName(section)}
          lessons={lessons}
          highlighted={false}
          dimmed={filtering && highlighted(section) === false}
          index={index}
          tabStop={index === listIndex}
          onGrab={() => onGrab(section.id, index)}
        />
      </div>
    </Fragment>
  ));

  const dropHint = board.overUnassign && (
    <p className={styles.hint}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 3v7m0 0 3-3m-3 3L5 7M3 13h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {dropHintText(board.hold.hand?.kind ?? null, board.ghost?.kind ?? null)}
    </p>
  );
  return <div className={styles.tray} data-tray data-over={dataAttribute(board.overUnassign)}>
    <div className={styles.list} data-section-scroll data-keyboard-zone="list" tabIndex={listTabIndex(board.hold.aim, empty)} data-aim={dataAttribute(listAimActive(board.hold.aim, empty))} onFocus={handleListFocus}>
      {empty && emptyContent}{rowCards}
    </div>
    {dropHint}
  </div>;
}
