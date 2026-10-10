import type { EditorDraft } from '#ui/lesson-editor/lessonEditor.draft.ts';
import type { Flash } from '#interaction/types.ts';

import { editLesson, placeFromEditor } from '#features/edit-lesson.ts';
import { useSchedule } from '#app/schedule.store.ts';

/** Удаление занятия: убрать из расписания, но не из секции. */
export function removeLesson(lessonId: string): void {
  useSchedule.getState().unassignLesson(lessonId);
}

export type SaveOutcome =
  | { kind: 'saved' }
  | { kind: 'skipped' }
  | { kind: 'rejected', text: string };

export type SaveInput = {
  draft: EditorDraft
  teacherId: string
  roomId: string
  sectionMode: boolean
  mark: (flash: Flash) => void
};

/** Сохранение редактора: сначала проверка, потом одна запись в стор. */
export function saveEditor(input: SaveInput): SaveOutcome {
  const { draft, teacherId, roomId, sectionMode, mark } = input;

  if (sectionMode) {
    const assigned = useSchedule.getState().assignSectionTeacher(draft.sectionId, teacherId);
    if (assigned.ok === false) return { kind: 'rejected', text: assigned.text };

    return { kind: 'saved' };
  }

  if (roomId === '') return { kind: 'skipped' };

  const before = new Set(useSchedule.getState().lessons.map((item) => item.id));
  const saved = draft.lessonId
    ? editLesson({ lessonId: draft.lessonId, teacherId, roomId })
    : placeFromEditor({ sectionId: draft.sectionId, teacherId, roomId, day: draft.day, timeSlotId: draft.timeSlotId });
  if (saved.ok === false) return { kind: 'rejected', text: saved.text };

  const created = useSchedule.getState().lessons.find((item) => before.has(item.id) === false);
  mark({ lessonId: draft.lessonId ?? created?.id ?? null, sectionId: draft.sectionId });

  return { kind: 'saved' };
}
