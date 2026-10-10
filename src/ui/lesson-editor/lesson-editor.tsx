import type { MouseEvent, ReactNode } from 'react';
import type { EditorRequest } from '#interaction/types.ts';
import type { ScheduleCatalog, Section } from '#schedule/types.ts';

import { closeOnEscape, moveBetweenControls } from '#ui/lesson-editor/lessonEditor.keyboard.ts';
import { draftOf, excessCount, initialRoomId, whenLabel } from '#ui/lesson-editor/lessonEditor.draft.ts';
import { editorResult } from '#ui/lesson-editor/lessonEditor.options.ts';
import { removeLesson, saveEditor } from '#ui/lesson-editor/lessonEditor.save.ts';
import { useEditorFocus } from '#ui/lesson-editor/lessonEditor.focus.ts';
import { plural } from '#ui/plural.ts';
import { EditorFields } from './lessonEditor.fields.tsx';
import { useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from '#ui/lesson-editor/lesson-editor.module.css';

type LessonEditorProps = {
  catalog: ScheduleCatalog
  request: EditorRequest
  onClose: () => void
};

export type EditorView = {
  catalog: ScheduleCatalog
  section: Section
  draft: ReturnType<typeof draftOf>
  lessons: ReturnType<typeof useSchedule.getState>['lessons']
};

export function LessonEditor({ catalog, request, onClose }: LessonEditorProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const lessons = useSchedule((state) => state.lessons);
  const mark = useBoard().mark;
  const draft = draftOf(catalog, request, lessons);
  const [teacherId, setTeacherId] = useState(draft.teacherId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState(() => initialRoomId(catalog, draft, lessons));

  useEditorFocus(dialog, request);

  const section = catalog.sections.find((item) => item.id === draft.sectionId);
  if (section === undefined) return null;

  const view: EditorView = { catalog, section, draft, lessons };
  const sectionMode = request.mode === 'section';
  const course = catalog.courses.find((item) => item.id === section.courseId);
  const timeSlot = catalog.timeSlots.find((item) => item.id === draft.timeSlotId);
  const result = editorResult({ ...view, sectionMode, teacherId, roomId });
  const assigned = lessons.filter((lesson) => lesson.sectionId === section.id).length;
  const total = assigned + (request.mode === 'create' ? 1 : 0);
  const extra = excessCount({ assigned, total, required: section.requiredLessonsPerWeek });
  const reason = saveError ?? (result !== null && result.ok === false ? result.text : null);

  function handleTeacherChange(value: string): void {
    setTeacherId(value);
    setSaveError(null);
  }

  function handleRoomChange(value: string): void {
    setRoomId(value);
  }

  function handleSave(): void {
    const outcome = saveEditor({ draft, teacherId, roomId, sectionMode, mark });
    if (outcome.kind === 'rejected') {
      setSaveError(outcome.text);

      return;
    }

    if (outcome.kind === 'saved') onClose();
  }

  function handleDelete(): void {
    if (request.mode !== 'edit') return;

    removeLesson(request.lessonId);
    onClose();
  }

  function handleDialogClick(event: MouseEvent<HTMLDivElement>): void {
    event.stopPropagation();
  }

  function renderHeader(): ReactNode {
    return (
      <header className={styles.head}>
        <span className={styles.chip} data-course={view.section.courseId}>{course?.code ?? view.section.code}</span>
        <span className={styles.code}>{view.section.code}</span>
        <button type="button" className={styles.close} aria-label="Закрыть" onClick={onClose}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </header>
    );
  }

  function renderTitle(): ReactNode {
    return (
      <div className={styles.title}>
        <h2 id="editor-title">{course?.name ?? view.section.code}</h2>
        {sectionMode ? null : <p className={styles.when}>{whenLabel(draft.day, timeSlot)}</p>}
      </div>
    );
  }

  function renderNote(): ReactNode {
    const after = request.mode === 'create' ? ` · После сохранения: ${total}` : '';
    const note = reason ?? draft.text ?? `В расписании: ${assigned} из ${view.section.requiredLessonsPerWeek} занятий${after}`;

    return <p className={styles.note} role="status" aria-atomic="true" data-tone={reason ? 'bad' : 'calm'}>{note}</p>;
  }

  function renderExcess(): ReactNode {
    const after = request.mode === 'create' ? `После сохранения: ${total} занятий` : `Назначено ${assigned}`;

    return (
      <p className={styles.excess} role="status">
        <strong>⚠ На {extra} {plural(extra, 'занятие', 'занятия', 'занятий')} больше нормы</strong>
        <span>{after} · Нужно {view.section.requiredLessonsPerWeek}. Превышение можно оставить.</span>
      </p>
    );
  }

  function renderActions(): ReactNode {
    return (
      <div className={styles.actions}>
        {request.mode === 'edit' ? (
          <button type="button" data-editor-delete className={styles.remove} onClick={handleDelete}>Удалить</button>
        ) : (
          <button type="button" data-editor-footer-close className={styles.ghost} onClick={onClose}>Закрыть</button>
        )}
        <button
          type="button"
          className={styles.save}
          data-editor-save
          disabled={result?.ok !== true}
          title={reason ?? (roomId === '' ? 'Выберите аудиторию' : '')}
          onClick={handleSave}
        >
          Сохранить
        </button>
      </div>
    );
  }

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialog}
        className={styles.dialog}
        role="dialog"
        aria-labelledby="editor-title"
        aria-modal="true"
        onKeyDown={(event) => closeOnEscape(event, onClose)}
        onKeyDownCapture={moveBetweenControls}
        onClick={handleDialogClick}
      >
        {renderHeader()}
        {renderTitle()}
        <EditorFields view={view} sectionMode={sectionMode} teacherId={teacherId} roomId={roomId} onTeacherChange={handleTeacherChange} onRoomChange={handleRoomChange} />
        {renderNote()}
        <p className={styles.excess}>Преподаватель применяется ко всем занятиям секции {view.section.code}.</p>
        {extra > 0 ? renderExcess() : null}
        {renderActions()}
      </div>
    </div>,
    document.body,
  );
}
