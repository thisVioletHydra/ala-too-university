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
      <h1 className={styles.title}>Секции</h1>
      <div className={styles.find}>
        <label className={styles.searchLabel} htmlFor="section-search">Поиск</label>
        <input
          id="section-search"
          className={styles.search}
          value={props.query}
          placeholder="Название или код"
          onChange={(event) => props.onQuery(event.target.value)}
        />
      </div>
      <div className={styles.tray} data-tray data-over={board.overUnassign ? 'yes' : 'no'}>
        {board.overUnassign ? <p className={styles.hint}>Вернуть в не поставленные</p> : null}
        <div
          className={styles.list}
          data-keyboard-zone="list"
          tabIndex={props.sections.length === 0 || board.hold.aim === 'list:return' ? 0 : -1}
          data-aim={board.hold.aim === 'list:return' || (props.sections.length === 0 && board.hold.aim.startsWith('list:')) ? 'yes' : 'no'}
          onFocus={props.onEnter}
        >
          {props.sections.length === 0 ? <p className={styles.empty}>Ничего не найдено</p> : null}
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
      </div>
      <p className={styles.status}>
        {props.counts['not-done']} из {props.counts.all}
        {' '}
        (без преподавателя {props.counts['no-teacher']})
      </p>
    </aside>
  );
}
