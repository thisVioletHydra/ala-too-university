import type { ScheduleCatalog, Section } from '#schedule/types.ts';
import type { Dataset } from '#app/schedule.store.ts';

import { sectionTeacher } from '#schedule/section.teacher.ts';
import { bindHotkeys } from '#app/hotkeys.ts';
import { useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { readStoredSchedule } from '#data/schedule.storage.ts';
import { scheduleProgress } from '#schedule/section.progress.ts';
import { useHand } from '#features/use-hand.ts';
import { useSearch } from '#features/use-search.ts';
import { useUndo } from '#features/use-undo.ts';
import { DragGhost, HandCursor } from '#ui/drag-ghost/drag-ghost.tsx';
import { Filters } from '#ui/filters/filters.tsx';
import { LessonEditor } from '#ui/lesson-editor/lesson-editor.tsx';
import { ScheduleGrid } from '#ui/schedule-grid/schedule-grid.tsx';
import { SectionList } from '#ui/section-list/section-list.tsx';
import { UndoBar } from '#ui/undo-bar/undo-bar.tsx';
import { WorkspaceSettings } from '#ui/workspace-settings.tsx';
import { useCallback, useEffect, useState } from 'react';

type WorkspaceProps = {
  catalog: ScheduleCatalog
  dataset: Dataset
  onDataset: (dataset: Dataset) => void
};

export function Workspace(props: WorkspaceProps) {
  const storeCatalog = useSchedule((state) => state.catalog);
  useEffect(() => {
    if (storeCatalog) return;

    const store = useSchedule.getState();
    store.setCatalog(props.catalog);
    store.setDataset(props.dataset);
    const saved = readStoredSchedule();
    if (saved?.dataset === props.dataset) store.replaceLessons(saved.lessons, saved.past, saved.future);
    else store.replaceLessons(props.catalog.lessons);
  }, [storeCatalog, props.catalog, props.dataset]);
  const [sectionsHidden, setSectionsHidden] = useState(false);
  const lessons = useSchedule((state) => state.lessons);
  const remembered = useSchedule((state) => state.rememberedTeachers);
  const board = useBoard();
  const history = useUndo();
  const courseName = useCallback((section: Section) => {
    return props.catalog.courses.find((course) => course.id === section.courseId)?.name ?? section.code;
  }, [props.catalog]);
  const courseCode = useCallback((section: Section) => {
    return props.catalog.courses.find((course) => course.id === section.courseId)?.code ?? section.code;
  }, [props.catalog]);
  const search = useSearch({ sections: props.catalog.sections, lessons, courseName, remembered });
  const hand = useHand({
    listHidden: sectionsHidden,
    sections: search.visible,
    days: props.catalog.weekDays.map((day) => day.id),
    slots: props.catalog.timeSlots.map((timeSlot) => timeSlot.id),
    lessons,
  });

  const setEditor = board.setEditor;
  const undo = history.undo;
  const redo = history.redo;

  useEffect(() => {
    return bindHotkeys({
      undo: () => {
        setEditor(null);
        undo();
      },
      redo: () => {
        setEditor(null);
        redo();
      },
      focusSearch: () => {
        setSectionsHidden(false);
        requestAnimationFrame(() => document.getElementById('section-search')?.focus());
      },
      close: () => setEditor(null),
    });
  }, [setEditor, undo, redo]);

  function teacherName(section: Section): string | null {
    const id = sectionTeacher(section, lessons, remembered);
    if (id === null || id === undefined) return null;

    return props.catalog.teachers.find((teacher) => teacher.id === id)?.shortName ?? null;
  }

  let editorKey = 'closed';
  const editor = board.editor;
  if (editor?.mode === 'edit') editorKey = editor.lessonId;

  if (editor?.mode === 'section') editorKey = `section-${editor.sectionId}`;

  if (editor?.mode === 'create') editorKey = `${editor.sectionId}-${editor.day}-${editor.timeSlotId}`;

  const { required, placed, remaining } = scheduleProgress(props.catalog.sections, lessons);
  const carried = board.ghost ?? board.hold.hand;
  const sourceLesson = carried?.kind === 'lesson' ? lessons.find((lesson) => lesson.id === carried.lessonId) : undefined;
  const carriedSection = props.catalog.sections.find((section) => section.id === (carried?.kind === 'section' ? carried.sectionId : sourceLesson?.sectionId));
  const sourceDay = props.catalog.weekDays.find((day) => day.id === sourceLesson?.day);
  const sourceSlot = props.catalog.timeSlots.find((slot) => slot.id === sourceLesson?.timeSlotId);
  const destinationDay = props.catalog.weekDays.find((day) => board.overKey?.startsWith(`${day.id}|`));
  const destinationSlot = props.catalog.timeSlots.find((slot) => board.overKey?.endsWith(`|${slot.id}`));

  function isSectionHighlighted(section: Section): boolean {
    if (search.teacherId === null || search.teacherId === undefined) return false;

    return sectionTeacher(section, lessons, remembered) === search.teacherId;
  }

  function enterSectionList(): void {
    hand.enter('list');
  }

  function dropIntoSectionList(): void {
    const held = board.hold.hand;
    if (held) board.dropHand(held, { kind: 'unassign' });
  }

  return (
    <div className="shell">
      <header className="top">
        <div>
          <h1><img className="app-logo" src="/logo.svg" alt="" />Расписание на неделю</h1>
          <p className="hint">Занятия, преподаватели и аудитории — в одной сетке</p>
        </div>
        <div id="keyboard-hints-slot" className="keyboard-hints-slot" />
        <div className="actions">
          <UndoBar
            canClear={lessons.length > 0 && !board.ghost}
            onClear={() => {
              if (window.confirm('Вы уверены? Все занятия будут убраны из расписания.') === false) return;

              board.setEditor(null);
              board.clearLanding();
              board.setHold({ hand: null, aim: '', overKey: null, overList: false });
              useSchedule.getState().clearLessons();
            }}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={() => {
              board.setEditor(null);
              history.undo();
            }}
            onRedo={() => {
              board.setEditor(null);
              history.redo();
            }}
          />
          <button type="button" className="settings-trigger" aria-controls="sections-panel" aria-expanded={!sectionsHidden} aria-label={sectionsHidden ? 'Показать секции' : 'Свернуть секции'} title={sectionsHidden ? 'Показать секции' : 'Свернуть секции'} onClick={() => setSectionsHidden((hidden) => !hidden)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="4" />
              <path d="M9 4v16" />
              <path d={sectionsHidden ? 'm13 9 3 3-3 3' : 'm16 9-3 3 3 3'} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <WorkspaceSettings dataset={props.dataset} onDataset={props.onDataset} />
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
            teachers: props.catalog.teachers,
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
            <div className="schedule-summary"
            title={carried ? 'Перенос занятия: исходное место и текущая цель' : `${placed} из ${required} занятий поставлено; осталось ${remaining}`}>
              {carried
                ? <><strong>{carriedSection?.code}</strong><span className="transfer-origin">Откуда: {sourceLesson ? `${sourceDay?.label}, ${sourceSlot?.start}` : 'список секций'}</span><span>{destinationDay && destinationSlot ? `→ ${destinationDay.label}, ${destinationSlot.start}` : 'Выберите ячейку'}</span></>
                : <>
              <strong>{placed}<span> / {required} занятий</span></strong>
              <progress value={placed} max={Math.max(required, 1)} aria-label="Прогресс составления расписания" />
              <span>{remaining === 0 ? 'Всё готово' : `Осталось ${remaining}`}</span>
              </>}
            </div>
          <Filters
            teachers={props.catalog.teachers}
            rooms={props.catalog.rooms}
            teacherId={search.teacherId}
            roomId={search.roomId}
            onTeacher={search.setTeacherId}
            onRoom={search.setRoomId}
          />
          </div>
          <ScheduleGrid
            catalog={props.catalog}
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
      {board.editor
        ? (
          <LessonEditor
            key={editorKey}
            catalog={props.catalog}
            request={board.editor}
            onClose={() => board.setEditor(null)}
          />
        )
        : null}
      <DragGhost catalog={props.catalog} />
      <HandCursor catalog={props.catalog} />
    </div>
  );
}
