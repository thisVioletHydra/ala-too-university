import type { EditorRequest } from '#interaction/types.ts';
import type { ScheduleCatalog, Section } from '#schedule/types.ts';

import { sectionTeacher } from '#schedule/section.teacher.ts';
import { bindHotkeys } from '#accessible/keyboard.shortcuts.ts';
import { useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { useScheduleAnnouncements } from '#features/schedule.announcements.ts';
import { useHand } from '#features/use-hand.ts';
import { useSearch } from '#features/use-search.ts';
import { useUndo } from '#features/use-undo.ts';
import { useCallback, useEffect, useState } from 'react';

export function useWorkspace(catalog: ScheduleCatalog) {
  useScheduleAnnouncements();
  const [sectionsHidden, setSectionsHidden] = useState(false);
  const lessons = useSchedule((state) => state.lessons);
  const remembered = useSchedule((state) => state.rememberedTeachers);
  const board = useBoard();
  const history = useUndo();
  const courseName = useCallback((section: Section) => {
    return catalog.courses.find((course) => course.id === section.courseId)?.name ?? section.code;
  }, [catalog]);
  const courseCode = useCallback((section: Section) => {
    return catalog.courses.find((course) => course.id === section.courseId)?.code ?? section.code;
  }, [catalog]);
  const search = useSearch({ sections: catalog.sections, lessons, courseName, remembered });
  const hand = useHand({
    listHidden: sectionsHidden,
    sections: search.visible,
    days: catalog.weekDays.map((day) => day.id),
    slots: catalog.timeSlots.map((timeSlot) => timeSlot.id),
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

    return catalog.teachers.find((teacher) => teacher.id === id)?.shortName ?? null;
  }

  const editor = board.editor;
  const editorKey = editorIdentity(editor);

  function closeEditor(): void { board.setEditor(null); }

  function undoSchedule(): void {
    closeEditor();
    history.undo();
  }

  function redoSchedule(): void {
    closeEditor();
    history.redo();
  }

  function clearSchedule(): void {
    if (window.confirm('Вы уверены? Все занятия будут убраны из расписания.') === false) return;

    closeEditor();
    board.clearLanding();
    board.setHold({ hand: null, aim: '', overKey: null, overList: false });
    useSchedule.getState().clearLessons();
  }

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

  return {
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
  };
}

function editorIdentity(editor: EditorRequest | null): string {
  if (editor === null || editor === undefined) return 'closed';

  if (editor.mode === 'edit') return editor.lessonId;

  if (editor.mode === 'section') return `section-${editor.sectionId}`;

  return `${editor.sectionId}-${editor.day}-${editor.timeSlotId}`;
}
