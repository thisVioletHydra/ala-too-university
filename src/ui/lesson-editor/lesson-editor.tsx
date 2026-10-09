import { sectionTeacher } from '#schedule/section-teacher.ts';
import type { EditorRequest } from '#interaction/types.ts';
import type { Lesson, ScheduleCatalog, WeekDay } from '#schedule/types.ts';

import { editLesson, placeFromEditor } from '#features/edit-lesson.ts';
import { useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { explainSlot } from '#schedule/conflicts.ts';
import { placementConflict } from '#schedule/conflicts.ts';
import { pickRoom } from '#schedule/pick-room.ts';
import { plural } from '#ui/plural.ts';
import { Select } from '#ui/select/select.tsx';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from '#ui/lesson-editor/lesson-editor.module.css';

const shortDay: Record<WeekDay, string> = {
  MON: 'Понедельник',
  TUE: 'Вторник',
  WED: 'Среда',
  THU: 'Четверг',
  FRI: 'Пятница',
};

type LessonEditorProps = {
  catalog: ScheduleCatalog
  request: EditorRequest
  onClose: () => void
};

export function LessonEditor(props: LessonEditorProps) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const request = props.request;
    const source = request.mode === 'edit'
      ? useSchedule.getState().lessons.find((lesson) => lesson.id === request.lessonId)
      : null;
    const slot = previous instanceof Element ? previous.closest<HTMLElement>('[data-slot]') : null;
    const fallback = slot ?? (source
      ? document.querySelector<HTMLElement>(`[data-slot="${CSS.escape(`${source.day}|${source.timeSlotId}`)}"]`)
      : null);
    const root = dialog.current;
    const controls = () => Array.from(root?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]') ?? []);
    const focusFrame = window.requestAnimationFrame(() => {
      (root?.querySelector<HTMLElement>('[role="combobox"]') ?? controls()[0])?.focus({ preventScroll: true });
    });
    function trap(event: KeyboardEvent): void {
      if (event.key !== 'Tab') return;

      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    root?.addEventListener('keydown', trap);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      root?.removeEventListener('keydown', trap);
      window.requestAnimationFrame(() => {
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
        const picker = document.querySelector<HTMLDialogElement>('dialog[data-slot-picker][open]');
        if (picker) {
          if (!picker.contains(document.activeElement)) picker.querySelector<HTMLElement>('[data-lesson-id], [data-close-picker]')?.focus();
          return;
        }
        if (previous instanceof HTMLElement && previous.isConnected && !previous.closest('dialog:not([open])')) previous.focus();
        else if (fallback?.isConnected) fallback.focus();
      });
    };
  }, []);
  const lessons = useSchedule((state) => state.lessons);
  const mark = useBoard().mark;
  const draft = draftOf(props.catalog, props.request, lessons);
  const [teacherId, setTeacherId] = useState(draft.teacherId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [roomId, setRoomId] = useState(() => {
    if (draft.roomId) return draft.roomId;
    const initialSection = props.catalog.sections.find((item) => item.id === draft.sectionId);
    return initialSection ? pickRoom({
      section: initialSection,
      day: draft.day,
      timeSlotId: draft.timeSlotId,
      rooms: props.catalog.rooms,
      lessons,
      excludeLessonId: draft.excludeLessonId,
    })?.id ?? '' : '';
  });
  const section = props.catalog.sections.find((item) => item.id === draft.sectionId);
  if (section === null || section === undefined) return null;

  const course = props.catalog.courses.find((item) => item.id === section.courseId);
  const timeSlot = props.catalog.timeSlots.find((item) => item.id === draft.timeSlotId);
  const sectionMode = props.request.mode === 'section';
  const result = sectionMode ? { ok: true as const } : roomId
    ? placementConflict({
      placement: {
        sectionId: section.id,
        teacherId,
        roomId,
        day: draft.day,
        timeSlotId: draft.timeSlotId,
      },
      lessons,
      sections: props.catalog.sections,
      rooms: props.catalog.rooms,
      blockedSlots: props.catalog.blockedSlots,
      excludeLessonId: draft.excludeLessonId,
    })
    : null;

  function save(): void {
    if (sectionMode) {
      const saved = useSchedule.getState().assignSectionTeacher(draft.sectionId, teacherId);
      if (!saved.ok) { setSaveError(saved.text); return; }
      props.onClose();
      return;
    }
    if (!roomId) return;

    const before = new Set(useSchedule.getState().lessons.map((item) => item.id));
    const saved = draft.lessonId
      ? editLesson({ lessonId: draft.lessonId, teacherId, roomId })
      : placeFromEditor({
        sectionId: draft.sectionId,
        teacherId,
        roomId,
        day: draft.day,
        timeSlotId: draft.timeSlotId,
      });
    if (!saved.ok) { setSaveError(saved.text); return; }

    const created = useSchedule.getState().lessons.find((item) => !before.has(item.id));
    mark({ lessonId: draft.lessonId ?? created?.id ?? null, sectionId: draft.sectionId });
    props.onClose();
  }

  const reason = saveError ?? (result && !result.ok ? result.text : null);
  const assigned = lessons.filter((lesson) => lesson.sectionId === section.id).length;
  const total = assigned + (props.request.mode === 'create' ? 1 : 0);
  const extra = Math.max(0, total - section.requiredLessonsPerWeek);
  const when = timeSlot
    ? `${shortDay[draft.day]} · ${timeSlot.start}–${timeSlot.end}`
    : shortDay[draft.day];

  return createPortal(
    <div className={styles.backdrop} onClick={props.onClose}>
      <div
        ref={dialog}
        className={styles.dialog}
        role="dialog"
        aria-labelledby="editor-title"
        aria-modal="true"
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || event.defaultPrevented) return;
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat) props.onClose();
        }}
        onKeyDownCapture={(event) => {
          const keyboardCheck = !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
            || event.altKey
            || event.ctrlKey
            || event.metaKey;

          if (keyboardCheck) return;

          const target = event.target;
          if (!(target instanceof Element)) return;

          if (target.closest('[role="combobox"][aria-expanded="true"]')) return;

          const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown';
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]'))
            .filter((control) => !vertical || !control.hasAttribute('data-editor-delete'));
          if (vertical) {
            const saveIndex = controls.findIndex((control) => control.hasAttribute('data-editor-save'));
            const closeIndex = controls.findIndex((control) => control.hasAttribute('data-editor-footer-close'));
            if (saveIndex >= 0 && closeIndex >= 0 && closeIndex < saveIndex) {
              const [saveControl] = controls.splice(saveIndex, 1);
              controls.splice(closeIndex, 0, saveControl);
            }
          }
          const current = controls.indexOf(document.activeElement as HTMLElement);
          const direction = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1;
          event.preventDefault();
          event.stopPropagation();
          controls[(current + direction + controls.length) % controls.length]?.focus();
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.head}>
          <span className={styles.chip} data-course={section.courseId}>{course?.code ?? section.code}</span>
          <span className={styles.code}>{section.code}</span>
          <button
            type="button"
            className={styles.close}
            aria-label="Закрыть"
            onClick={props.onClose}
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
        </header>
        <div className={styles.title}>
          <h2 id="editor-title">{course?.name ?? section.code}</h2>
          {!sectionMode ? <p className={styles.when}>{when}</p> : null}
        </div>
        <div className={styles.fields}>
          <label className={styles.field}>
            <span className={styles.teacherLabel}>
              <span className={styles.label}>Преподаватель</span>
              {!teacherId ? <span className={styles.teacherNotice} role="status"><span className={styles.teacherWarning} aria-hidden="true">!</span>Нужен преподаватель</span> : null}
            </span>
            <Select label="Преподаватель" value={teacherId} onChange={(value) => { setTeacherId(value); setSaveError(null); }} options={[{ value: '', label: 'Выберите преподавателя' }, ...section.allowedTeacherIds.map((id) => {
              const teacher = props.catalog.teachers.find((item) => item.id === id);
              const advice = explainSlot({
                section,
                day: draft.day,
                timeSlotId: draft.timeSlotId,
                lessons,
                rooms: props.catalog.rooms,
                sections: props.catalog.sections,
                blockedSlots: props.catalog.blockedSlots,
                teacherId: id,
                roomId: null,
                excludeLessonId: draft.excludeLessonId,
              });
              const blocked = !sectionMode && !advice.ok && !advice.needsChoice;
              return { value: id, label: teacher?.shortName ?? id, disabled: blocked, detail: blocked ? advice.text ?? undefined : undefined };
            })]} />
          </label>
          {!sectionMode ? <label className={styles.field}>
            <span className={styles.label}>Аудитория</span>
            <Select label="Аудитория" value={roomId} onChange={setRoomId} options={[{ value: '', label: 'Выберите аудиторию' }, ...props.catalog.rooms.map((room) => {
              const tooSmall = room.capacity < section.studentsCount;
              const busy = teacherId
                ? placementConflict({
                  placement: {
                    sectionId: section.id,
                    teacherId,
                    roomId: room.id,
                    day: draft.day,
                    timeSlotId: draft.timeSlotId,
                  },
                  lessons,
                  sections: props.catalog.sections,
                  rooms: props.catalog.rooms,
                  blockedSlots: props.catalog.blockedSlots,
                  excludeLessonId: draft.excludeLessonId,
                })
                : null;
              const roomProblem = busy && !busy.ok && (busy.kind === 'room-busy' || busy.kind === 'room-small');
              const disabled = tooSmall || Boolean(roomProblem);
              const title = tooSmall
                ? `${room.capacity} мест, нужно ${section.studentsCount}`
                : roomProblem && !busy.ok
                  ? busy.text
                  : '';
              return { value: room.id, label: `${room.name} · ${room.capacity} мест`, disabled, detail: title || undefined };
            })]} />
          </label> : null}
        </div>
        <p className={styles.note} data-tone={reason ? 'bad' : 'calm'}>
          {reason ?? draft.text
            ?? `В расписании: ${assigned} из ${section.requiredLessonsPerWeek} занятий${props.request.mode === 'create' ? ` · После сохранения: ${total}` : ''}`}
        </p>
        <p className={styles.excess}>Преподаватель применяется ко всем занятиям секции {section.code}.</p>
        {extra > 0 ? <p className={styles.excess} role="status">
          <strong>⚠ На {extra} {plural(extra, 'занятие', 'занятия', 'занятий')} больше нормы</strong>
          <span>{props.request.mode === 'create' ? `После сохранения: ${total} занятий` : `Назначено ${assigned}`} · Нужно {section.requiredLessonsPerWeek}. Превышение можно оставить.</span>
        </p> : null}
        <div className={styles.actions}>
          {props.request.mode === 'edit' ? <button type="button" data-editor-delete className={styles.remove} onClick={() => {
            if (props.request.mode !== 'edit') return;
            useSchedule.getState().unassignLesson(props.request.lessonId);
            props.onClose();
          }}>Удалить</button> : <button type="button" data-editor-footer-close className={styles.ghost} onClick={props.onClose}>Закрыть</button>}
          <button
            type="button"
            className={styles.save}
            data-editor-save
            disabled={!result?.ok}
            title={reason ?? (!roomId ? 'Выберите аудиторию' : '')}
            onClick={save}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

type EditorDraft = {
  sectionId: string
  day: WeekDay
  timeSlotId: string
  teacherId: string
  roomId: string
  lessonId?: string
  excludeLessonId?: string
  text: string | null
};

function draftOf(
  catalog: ScheduleCatalog,
  request: EditorRequest,
  lessons: Lesson[],
): EditorDraft {
  if (request.mode === 'section') {
    const section = catalog.sections.find((item) => item.id === request.sectionId);
    return { sectionId: request.sectionId, day: 'MON', timeSlotId: '', roomId: '', teacherId: section ? sectionTeacher(section, lessons, useSchedule.getState().rememberedTeachers) ?? '' : '', text: null };
  }
  if (request.mode === 'create') {
    return {
      sectionId: request.sectionId,
      day: request.day,
      timeSlotId: request.timeSlotId,
      teacherId: request.teacherId ?? '',
      roomId: request.roomId ?? '',
      text: request.text,
    };
  }

  const lesson = lessons.find((item) => item.id === request.lessonId);
  const section = catalog.sections.find((item) => item.id === lesson?.sectionId);

  return {
    sectionId: section?.id ?? '',
    day: lesson?.day ?? 'MON',
    timeSlotId: lesson?.timeSlotId ?? '',
    teacherId: lesson?.teacherId ?? '',
    roomId: lesson?.roomId ?? '',
    lessonId: lesson?.id,
    excludeLessonId: lesson?.id,
    text: null,
  };
}
