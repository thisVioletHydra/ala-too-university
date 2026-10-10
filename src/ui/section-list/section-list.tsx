import type { Grouping } from '#features/section-groups.ts';
import type { ListMode } from '#features/use-search.ts';
import type { Lesson, Section, Teacher } from '#schedule/types.ts';

import { SectionListHeader } from './sectionList.header.tsx';
import { SectionListBody } from './sectionList.body.tsx';
import { SectionListFooter } from './sectionList.footer.tsx';
import { useBoard } from '#app/providers.tsx';
import { useDroppable } from '@dnd-kit/core';

import styles from '#ui/section-list/section-list.module.css';

export type SectionListProps = {
  hidden: boolean;
  filters: {
    groupBy: Grouping;
    onGroupBy: (value: Grouping) => void;
    sectionTeacherId: string;
    onSectionTeacher: (value: string) => void;
    teachers: Teacher[];
    mode: ListMode;
    onMode: (mode: ListMode) => void;
    query: string;
    counts: Record<ListMode, number>;
    onQuery: (query: string) => void;
  };
  content: {
    sections: Section[];
    lessons: Lesson[];
    courseName: (section: Section) => string;
    courseCode: (section: Section) => string;
    teacherName: (section: Section) => string | null;
    highlighted: (section: Section) => boolean;
    filtering: boolean;
  };
  navigation: {
    listIndex: number;
    onEnter: () => void;
    onGrab: (sectionId: string, index: number) => void;
    onPoint: () => void;
    onLeave: () => void;
    onDrop: () => void;
  };
};

export function SectionList({ hidden, filters, content, navigation }: SectionListProps) {
  const { mode, onMode, counts } = filters;
  const { onPoint, onLeave, onDrop } = navigation;
  const board = useBoard();
  const { setNodeRef } = useDroppable({ id: 'unassign', data: { kind: 'unassign' } });

  function handlePanelClick(event: React.MouseEvent<HTMLElement>): void {
    if (!board.hold.hand || board.skipClick()) return;

    if (!(event.target instanceof Element)) return;

    if (event.target.closest('button, input')) return;

    onDrop();
  }


  return (
    <aside
      id="sections-panel"
      aria-hidden={hidden || undefined}
      ref={setNodeRef}
      className={styles.panel}
      onPointerOver={onPoint}
      onPointerLeave={onLeave}
      onClick={handlePanelClick}
    >
      <SectionListHeader filters={filters}>
        <SectionListBody filters={filters} content={content} navigation={navigation} />
        <SectionListFooter counts={counts} mode={mode} onMode={onMode} />
      </SectionListHeader>
    </aside>
  );
}
