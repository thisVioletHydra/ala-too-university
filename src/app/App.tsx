import type { ScheduleCatalog, Section } from '#schedule/types.ts'

import { bindHotkeys } from '#app/hotkeys.ts'
import { Providers, useBoard } from '#app/providers.tsx'
import { useSchedule, type Dataset } from '#app/schedule.store.ts'
import { loadSchedule } from '#data/schedule.parser.ts'
import { readStoredSchedule } from '#data/schedule.storage.ts'
import { withManySections } from '#data/withManySections.ts'
import { useHand } from '#features/use-hand.ts'
import { useSearch } from '#features/use-search.ts'
import { useStorage } from '#features/use-storage.ts'
import { useUndo } from '#features/use-undo.ts'
import { DragGhost, HandCursor } from '#ui/drag-ghost/drag-ghost.tsx'
import { Filters } from '#ui/filters/filters.tsx'
import { LessonEditor } from '#ui/lesson-editor/lesson-editor.tsx'
import { ScheduleGrid } from '#ui/schedule-grid/schedule-grid.tsx'
import { SectionList } from '#ui/section-list/section-list.tsx'
import { Status } from '#ui/status/status.tsx'
import { UndoBar } from '#ui/undo-bar/undo-bar.tsx'
import { useCallback, useEffect, useState } from 'react'

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
      if (!active) return

      const stored = readStoredSchedule();
      const mode = stored?.dataset === 'bulk' ? 'bulk' : 'mock';
      setMock(next);
      apply(next, mode);
      if (stored?.dataset === mode) {
        useSchedule.getState().replaceLessons(stored.lessons, stored.past, stored.future);
      }

      setStatus('ready');
    }).catch((error: unknown) => {
      if (!active) return

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
  const search = useSearch(props.catalog.sections, lessons, courseName);
  const hand = useHand({
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
        document.getElementById('section-search')?.focus();
      },
      close: () => setEditor(null),
    });
  }, [setEditor, undo, redo]);

  function teacherName(section: Section): string | null {
    const id = section.teacherId ?? remembered[section.id];
    if (id === null || id === undefined) return null;
    return props.catalog.teachers.find((teacher) => teacher.id === id)?.shortName ?? null;
  }

  const editorKey = board.editor?.mode === 'edit'
    ? board.editor.lessonId
    : board.editor
      ? `${board.editor.sectionId}-${board.editor.day}-${board.editor.timeSlotId}`
      : 'closed';

  return (
    <div className="shell">
      <header className="top">
        <div>
          <h1>Расписание</h1>
          <p className="hint">Чтобы скопировать занятие, перетащите его с зажатой клавишей Alt</p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="dataset"
            aria-pressed={props.dataset === 'bulk'}
            onClick={() => {
              board.setEditor(null);
              props.onDataset(props.dataset === 'mock' ? 'bulk' : 'mock');
            }}
          >
            {props.dataset === 'mock' ? '500 позиций' : 'Мок'}
          </button>
          <UndoBar
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
        </div>
      </header>
      <div className="workspace">
        <SectionList
          sections={search.visible}
          lessons={lessons}
          courseName={courseName}
          courseCode={courseCode}
          teacherName={teacherName}
          highlighted={(section) => {
            const id = section.teacherId ?? remembered[section.id];
            if (search.teacherId === null || search.teacherId === undefined) return false;
            return id === search.teacherId;
          }}
          query={search.query}
          counts={search.counts}
          onQuery={search.setQuery}
          listIndex={hand.listIndex}
          onEnter={() => hand.enter('list')}
          onGrab={hand.grabSection}
          onPoint={hand.pointList}
          onDrop={() => {
            const held = board.hold.hand;
            if (held?.kind === 'lesson') board.dropHand(held, { kind: 'unassign' });
          }}
        />
        <section className="board">
          <Filters
            teachers={props.catalog.teachers}
            rooms={props.catalog.rooms}
            teacherId={search.teacherId}
            roomId={search.roomId}
            onTeacher={search.setTeacherId}
            onRoom={search.setRoomId}
          />
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
