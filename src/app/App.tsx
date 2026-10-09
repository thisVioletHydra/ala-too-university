import { sectionTeacher } from '#schedule/section-teacher.ts';
import type { ScheduleCatalog, Section } from '#schedule/types.ts';
import type { Dataset } from '#app/schedule.store.ts';

import { bindHotkeys } from '#app/hotkeys.ts';
import { Providers, useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { loadSchedule } from '#data/schedule.parser.ts';
import { readStoredSchedule } from '#data/schedule.storage.ts';
import { withManySections } from '#data/withManySections.ts';
import { scheduleProgress } from '#schedule/section-progress.ts';
import { useHand } from '#features/use-hand.ts';
import { useSearch } from '#features/use-search.ts';
import { useStorage } from '#features/use-storage.ts';
import { useUndo } from '#features/use-undo.ts';
import { DragGhost, HandCursor } from '#ui/drag-ghost/drag-ghost.tsx';
import { Filters } from '#ui/filters/filters.tsx';
import { LessonEditor } from '#ui/lesson-editor/lesson-editor.tsx';
import { ScheduleGrid } from '#ui/schedule-grid/schedule-grid.tsx';
import { SectionList } from '#ui/section-list/section-list.tsx';
import { Status } from '#ui/status/status.tsx';
import { UndoBar } from '#ui/undo-bar/undo-bar.tsx';
import { WorkspaceSettings } from '#ui/workspace-settings.tsx';
import { useCallback, useEffect, useState } from 'react';

export default function App() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [message, setMessage] = useState('Не удалось загрузить расписание');
  const [catalog, setCatalog] = useState<ScheduleCatalog | null>(null);
  const [mock, setMock] = useState<ScheduleCatalog | null>(null);
  const [dataset, setDataset] = useState<Dataset>('mock');
  const ready = status === 'ready' && catalog !== null;

  function apply(base: ScheduleCatalog, mode: Dataset): void {
    const next = mode === 'bulk' ? withManySections(base, 500) : base;
    useSchedule.getState().setDataset(mode);
    useSchedule.getState().setCatalog(next);
    useSchedule.getState().replaceLessons(next.lessons);
    setDataset(mode);
    setCatalog(next);
  }

  function load(fail: boolean): void {
    setStatus('loading');
    loadSchedule({ fail }).then((next) => {
      setMock(next);
      apply(next, 'mock');
      setStatus('ready');
    }).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить расписание');
      setStatus('error');
    });
  }

  useEffect(() => {
    let active = true;
    const fail = new URLSearchParams(location.search).has('fail');
    setStatus('loading');
    loadSchedule({ fail }).then((next) => {
      if (!active) return;

      const stored = readStoredSchedule();
      const mode = stored?.dataset === 'bulk' ? 'bulk' : 'mock';
      setMock(next);
      apply(next, mode);
      if (stored?.dataset === mode) {
        useSchedule.getState().replaceLessons(stored.lessons, stored.past, stored.future);
      }

      setStatus('ready');
    }).catch((error: unknown) => {
      if (!active) return;

      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить расписание');
      setStatus('error');
    });
    return () => {
      active = false;
    };
  }, []);

  useStorage(ready);

  if (!ready || !catalog) {
    return (
      <Status
        kind={status === 'error' ? 'error' : 'loading'}
        message={message}
        onRetry={() => {
          history.replaceState(null, '', location.pathname);
          load(false);
        }}
      />
    );
  }

  return (
    <Providers catalog={catalog}>
      <Workspace
        catalog={catalog}
        dataset={dataset}
        onDataset={(mode) => {
          if (mock) apply(mock, mode);
        }}
      />
    </Providers>
  );
}

type WorkspaceProps = {
  catalog: ScheduleCatalog
  dataset: Dataset
  onDataset: (dataset: Dataset) => void
};

function Workspace(props: WorkspaceProps) {
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
  const search = useSearch(props.catalog.sections, lessons, courseName, remembered);
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

  const editorKey = board.editor?.mode === 'edit'
    ? board.editor.lessonId
    : board.editor?.mode === 'section' ? `section-${board.editor.sectionId}` : board.editor
      ? `${board.editor.sectionId}-${board.editor.day}-${board.editor.timeSlotId}`
      : 'closed';

  const { required, placed, remaining } = scheduleProgress(props.catalog.sections, lessons);
  const carried = board.ghost ?? board.hold.hand;
  const sourceLesson = carried?.kind === 'lesson' ? lessons.find((lesson) => lesson.id === carried.lessonId) : undefined;
  const carriedSection = props.catalog.sections.find((section) => section.id === (carried?.kind === 'section' ? carried.sectionId : sourceLesson?.sectionId));
  const sourceDay = props.catalog.weekDays.find((day) => day.id === sourceLesson?.day);
  const sourceSlot = props.catalog.timeSlots.find((slot) => slot.id === sourceLesson?.timeSlotId);
  const destinationDay = props.catalog.weekDays.find((day) => board.overKey?.startsWith(`${day.id}|`));
  const destinationSlot = props.catalog.timeSlots.find((slot) => board.overKey?.endsWith(`|${slot.id}`));

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
              if (window.confirm('Вы уверены? Все занятия будут убраны из расписания.') === null || window.confirm('Вы уверены? Все занятия будут убраны из расписания.') === undefined) return;

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
          sections={search.visible}
          groupBy={search.groupBy}
          onGroupBy={search.setGroupBy}
          sectionTeacherId={search.sectionTeacherId}
          onSectionTeacher={search.setSectionTeacherId}
          teachers={props.catalog.teachers}
          lessons={lessons}
          courseName={courseName}
          courseCode={courseCode}
          teacherName={teacherName}
          highlighted={(section) => {
            const id = sectionTeacher(section, lessons, remembered);
            if (search.teacherId === null || search.teacherId === undefined) return false;

            return id === search.teacherId;
          }}
          filtering={search.teacherId !== null}
          mode={search.mode}
          onMode={search.setMode}
          query={search.query}
          counts={search.counts}
          onQuery={search.setQuery}
          listIndex={hand.listIndex}
          onEnter={() => hand.enter('list')}
          onGrab={hand.grabSection}
          onPoint={hand.pointList}
          onLeave={hand.leaveList}
          onDrop={() => {
            const held = board.hold.hand;
            if (held) board.dropHand(held, { kind: 'unassign' });
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
