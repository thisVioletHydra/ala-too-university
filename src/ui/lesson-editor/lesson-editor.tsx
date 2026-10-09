import type { EditorRequest } from '#app/providers.tsx';
import type { Lesson, ScheduleCatalog, WeekDay } from '#schedule/types.ts';

import { editLesson, placeFromEditor } from '#features/edit-lesson.ts';
import { useBoard } from '#app/providers.tsx';
import { useSchedule } from '#app/schedule.store.ts';
import { explainSlot } from '#schedule/conflicts.ts';
import { placementConflict } from '#schedule/conflicts.ts';
import { useState } from 'react';
import { createPortal } from 'react-dom';

import styles from '#ui/lesson-editor/lesson-editor.module.css';

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

  return createPortal(
    <div className={styles.backdrop} onClick={props.onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-labelledby="editor-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="editor-title">{props.catalog.courses.find((item) => item.id === section.courseId)?.name ?? section.code}</h2>
        <p className={styles.code}>{section.code}</p>
        <label className={styles.field}>
          Преподаватель
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
          Аудитория
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
        {reason ? <p className={styles.reason}>{reason}</p> : null}
        {draft.text && !reason ? <p className={styles.reason}>{draft.text}</p> : null}
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
