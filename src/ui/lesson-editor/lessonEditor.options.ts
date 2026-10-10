import type { ConflictResult, Lesson, ScheduleCatalog, Section } from '#schedule/types.ts';
import type { EditorDraft } from '#ui/lesson-editor/lessonEditor.draft.ts';

import { explainSlot, placementConflict } from '#schedule/conflicts.ts';

type EditorOption = {
  value: string
  label: string
  disabled?: boolean
  detail?: string
};

type EditorResult = { ok: true } | ConflictResult | null;

type FieldInput = {
  catalog: ScheduleCatalog
  section: Section
  draft: EditorDraft
  lessons: Lesson[]
};

type TeacherOptionInput = FieldInput & {
  sectionMode: boolean
};

type RoomOptionInput = FieldInput & {
  teacherId: string
};

type ResultInput = FieldInput & {
  sectionMode: boolean
  teacherId: string
  roomId: string
};

export function editorResult(input: ResultInput): EditorResult {
  if (input.sectionMode) return { ok: true };

  if (input.roomId === '') return null;

  return placementConflict({
    placement: {
      sectionId: input.section.id,
      teacherId: input.teacherId,
      roomId: input.roomId,
      day: input.draft.day,
      timeSlotId: input.draft.timeSlotId,
    },
    lessons: input.lessons,
    sections: input.catalog.sections,
    rooms: input.catalog.rooms,
    blockedSlots: input.catalog.blockedSlots,
    excludeLessonId: input.draft.excludeLessonId,
  });
}

export function teacherOptions(input: TeacherOptionInput): EditorOption[] {
  const { catalog, section, draft, lessons, sectionMode } = input;
  const allowed = section.allowedTeacherIds.map((id) => {
    const teacher = catalog.teachers.find((item) => item.id === id);
    const advice = explainSlot({
      section,
      day: draft.day,
      timeSlotId: draft.timeSlotId,
      lessons,
      rooms: catalog.rooms,
      sections: catalog.sections,
      blockedSlots: catalog.blockedSlots,
      teacherId: id,
      roomId: null,
      excludeLessonId: draft.excludeLessonId,
    });
    const blocked = sectionMode === false && advice.ok === false && advice.needsChoice === false;

    return {
      value: id,
      label: teacher?.shortName ?? id,
      disabled: blocked,
      detail: blocked ? advice.text ?? undefined : undefined,
    };
  });

  return [{ value: '', label: 'Выберите преподавателя' }, ...allowed];
}

export function roomOptions(input: RoomOptionInput): EditorOption[] {
  const { catalog, section, draft, lessons, teacherId } = input;
  const rooms = catalog.rooms.map((room) => {
    const tooSmall = room.capacity < section.studentsCount;
    const busy = teacherId === ''
      ? null
      : placementConflict({
        placement: {
          sectionId: section.id,
          teacherId,
          roomId: room.id,
          day: draft.day,
          timeSlotId: draft.timeSlotId,
        },
        lessons,
        sections: catalog.sections,
        rooms: catalog.rooms,
        blockedSlots: catalog.blockedSlots,
        excludeLessonId: draft.excludeLessonId,
      });
    const busyForStudents = busy !== null && busy.ok === false && (busy.kind === 'room-busy' || busy.kind === 'room-small');
    const busyText = busy !== null && busy.ok === false ? busy.text : undefined;
    const detail = roomDetail(room.capacity, section.studentsCount, tooSmall, busyForStudents, busyText);

    return {
      value: room.id,
      label: `${room.name} · ${room.capacity} мест`,
      disabled: tooSmall || busyForStudents,
      detail: detail === '' ? undefined : detail,
    };
  });

  return [{ value: '', label: 'Выберите аудиторию' }, ...rooms];
}

function roomDetail(
  capacity: number,
  studentsCount: number,
  tooSmall: boolean,
  busy: boolean,
  busyText: string | undefined,
): string {
  if (tooSmall) return `${capacity} мест, нужно ${studentsCount}`;

  if (busy) return busyText ?? '';

  return '';
}
