import type { EditorRequest } from '#app/providers.tsx';
import type { Lesson, ScheduleCatalog, WeekDay } from '#schedule/types.ts';

import { editLesson, placeFromEditor } from '#features/edit-lesson.ts';
import { useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { explainSlot } from '#schedule/conflicts.ts';
import { placementConflict } from '#schedule/conflicts.ts';
import { plural } from '#ui/plural.ts';
import { useState } from 'react';
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
  const lessons = useSchedule((state) => state.lessons);
  const mark = useBoard().mark;
  const draft = draftOf(props.catalog, props.request, lessons);
  const [teacherId, setTeacherId] = useState(draft.teacherId);
  const [roomId, setRoomId] = useState(draft.roomId);
  const section = props.catalog.sections.find((item) => item.id === draft.sectionId);
  if (section === null || section === undefined) return null;

  const course = props.catalog.courses.find((item) => item.id === section.courseId);
  const timeSlot = props.catalog.timeSlots.find((item) => item.id === draft.timeSlotId);
  const result = teacherId && roomId
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
    if (!teacherId || !roomId) return;

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
    if (!saved.ok) return;

    const created = useSchedule.getState().lessons.find((item) => !before.has(item.id));
    mark({ lessonId: draft.lessonId ?? created?.id ?? null, sectionId: draft.sectionId });
    props.onClose();
  }

  const reason = result && !result.ok ? result.text : null;
  const when = timeSlot
    ? `${shortDay[draft.day]} · ${timeSlot.start}–${timeSlot.end}`
    : shortDay[draft.day];

  return createPortal(
    <div className={styles.backdrop} onClick={props.onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-labelledby="editor-title"
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
          <p className={styles.when}>{when}</p>
        </div>
        <div className={styles.fields}>
          <label className={styles.field}>
            <span className={styles.label}>Преподаватель</span>
            <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
              <option value="">Выберите</option>
              {section.allowedTeacherIds.map((id) => {
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
                const blocked = !advice.ok && !advice.needsChoice;
                return (
                  <option key={id} value={id} disabled={blocked} title={advice.text ?? ''}>
                    {teacher?.shortName ?? id}{blocked ? ` — ${advice.text}` : ''}
                  </option>
                );
              })}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Аудитория</span>
            <select value={roomId} onChange={(event) => setRoomId(event.target.value)}>
              <option value="">Выберите</option>
              {props.catalog.rooms.map((room) => {
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
                return (
                  <option key={room.id} value={room.id} disabled={disabled} title={title}>
                    {room.name} · {room.capacity}{title ? ` — ${title}` : ''}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
        <p className={styles.note} data-tone={reason ? 'bad' : 'calm'}>
          {reason ?? draft.text
            ?? `Нужно ${section.requiredLessonsPerWeek} ${plural(section.requiredLessonsPerWeek, 'занятие', 'занятия', 'занятий')} в неделю · ${section.studentsCount} ${plural(section.studentsCount, 'студент', 'студента', 'студентов')}`}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={props.onClose}>Закрыть</button>
          <button
            type="button"
            className={styles.save}
            disabled={!result?.ok}
            title={reason ?? (!teacherId || !roomId ? 'Выберите преподавателя и аудиторию' : '')}
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
