import type { ScheduleCatalog } from '#schedule/types.ts';
import type { Dataset } from '#app/schedule.store.ts';

import { useWorkspace } from './workspace.model.ts';
import { DragGhost, HandCursor } from '#ui/drag-ghost/drag-ghost.tsx';
import { Filters } from '#ui/filters/filters.tsx';
import { LessonEditor } from '#ui/lesson-editor/lesson-editor.tsx';
import { ScheduleSummary } from '#ui/schedule-summary/schedule-summary.tsx';
import { ScheduleGrid } from '#ui/schedule-grid/schedule-grid.tsx';
import { SectionList } from '#ui/section-list/section-list.tsx';
import { UndoBar } from '#ui/undo-bar/undo-bar.tsx';
import { WorkspaceSettings } from '#ui/workspace-settings.tsx';

type WorkspaceProps = {
  catalog: ScheduleCatalog
  dataset: Dataset
  onDataset: (dataset: Dataset) => void
};

export function Workspace({ catalog, dataset, onDataset }: WorkspaceProps) {
  const {
    sectionsHidden,
    setSectionsHidden,
    lessons,
    board,
    history,
    search,
    hand,
    courseName,
    courseCode,
    teacherName,
    editor,
    editorKey,
    closeEditor,
    undoSchedule,
    redoSchedule,
    clearSchedule,
    isSectionHighlighted,
    enterSectionList,
    dropIntoSectionList,
  } = useWorkspace(catalog);
  const sectionsLabel = sectionsHidden ? 'Показать секции' : 'Свернуть секции';

  return (
    <div className="shell">
      <header className="top">
        <div>
          <h1><img className="app-logo" src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />Расписание на неделю</h1>
          <p className="hint">Занятия, преподаватели и аудитории — в одной сетке</p>
        </div>
        <div id="keyboard-hints-slot" className="keyboard-hints-slot" />
        <div className="actions">
          <UndoBar
            canClear={lessons.length > 0 && !board.ghost}
            onClear={clearSchedule}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={undoSchedule}
            onRedo={redoSchedule}
          />
          <button type="button" className="settings-trigger" aria-controls="sections-panel" aria-expanded={!sectionsHidden} aria-label={sectionsLabel} title={sectionsLabel} onClick={() => setSectionsHidden((hidden) => !hidden)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="4" />
              <path d="M9 4v16" />
              <path d={sectionsHidden ? 'm13 9 3 3-3 3' : 'm16 9-3 3 3 3'} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <WorkspaceSettings dataset={dataset} onDataset={onDataset} />
        </div>
      </header>
      <div className="workspace" data-sections={sectionsHidden ? 'hidden' : 'visible'}>
        <div className="sections-pane" inert={sectionsHidden}>
          <SectionList
            hidden={sectionsHidden}
            filters={{
              groupBy: search.groupBy,
              onGroupBy: search.setGroupBy,
              sectionTeacherId: search.sectionTeacherId,
              onSectionTeacher: search.setSectionTeacherId,
              teachers: catalog.teachers,
              mode: search.mode,
              onMode: search.setMode,
              query: search.query,
              counts: search.counts,
              onQuery: search.setQuery,
            }}
            content={{
              sections: search.visible,
              lessons,
              courseName,
              courseCode,
              teacherName,
              highlighted: isSectionHighlighted,
              filtering: search.teacherId !== null,
            }}
            navigation={{
              listIndex: hand.listIndex,
              onEnter: enterSectionList,
              onGrab: hand.grabSection,
              onPoint: hand.pointList,
              onLeave: hand.leaveList,
              onDrop: dropIntoSectionList,
            }}
          />
        </div>
        <section className="board">
          <div className="board-tools">
            <ScheduleSummary catalog={catalog} />
            <Filters
              teachers={catalog.teachers}
              rooms={catalog.rooms}
              teacherId={search.teacherId}
              roomId={search.roomId}
              onTeacher={search.setTeacherId}
              onRoom={search.setRoomId}
            />
          </div>
          <ScheduleGrid
            catalog={catalog}
            lessons={lessons}
            teacherId={search.teacherId}
            roomId={search.roomId}
            dayIndex={hand.dayIndex}
            slotIndex={hand.slotIndex}
            onEnter={() => hand.enter('grid')}
            onGrab={hand.grabLesson}
            onPoint={hand.pointGrid}
            onFocus={hand.focusGrid}
            onDrop={hand.dropAt}
          />
        </section>
      </div>
      {editor && <LessonEditor key={editorKey} catalog={catalog} request={editor} onClose={closeEditor} />}
      <DragGhost catalog={catalog} />
      <HandCursor catalog={catalog} />
    </div>
  );
}
