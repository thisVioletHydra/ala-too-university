import type { ConflictResult, Lesson, LessonEdit, LessonMove, Placement, ScheduleCatalog } from '#schedule/types.ts';

import { placementConflict } from '#schedule/conflicts.ts';
import { create } from 'zustand';

const historyLimit = 40;

export type Dataset = 'mock' | 'bulk';

type ScheduleStore = {
  catalog: ScheduleCatalog | null
  dataset: Dataset
  lessons: Lesson[]
  past: Lesson[][]
  future: Lesson[][]
  rememberedTeachers: Record<string, string>
  setCatalog: (catalog: ScheduleCatalog) => void
  setDataset: (dataset: Dataset) => void
  replaceLessons: (lessons: Lesson[], past?: Lesson[][], future?: Lesson[][]) => void
  rememberTeacher: (sectionId: string, teacherId: string) => void
  placeLesson: (placement: Placement) => ConflictResult
  moveLesson: (input: LessonMove) => ConflictResult
  unassignLesson: (lessonId: string) => void
  editLesson: (input: LessonEdit) => ConflictResult
  copyLesson: (input: LessonMove) => ConflictResult
  undo: () => void
  redo: () => void
};

export const useSchedule = create<ScheduleStore>((set, get) => ({
  catalog: null,
  dataset: 'mock',
  lessons: [],
  past: [],
  future: [],
  rememberedTeachers: {},
  setCatalog: (catalog) => {
    set({ catalog });
  },
  setDataset: (dataset) => {
    set({ dataset });
  },
  replaceLessons: (lessons, past = [], future = []) => {
    set({ lessons, past, future });
  },
  rememberTeacher: (sectionId, teacherId) => {
    set({
      rememberedTeachers: { ...get().rememberedTeachers, [sectionId]: teacherId },
    });
  },
  placeLesson: (placement) => {
    const result = check(get, placement);
    if (!result.ok) return result;

    commit(set, get, [...get().lessons, { ...placement, id: crypto.randomUUID() }]);

    return { ok: true };
  },
  moveLesson: (input) => {
    const current = get().lessons.find((item) => item.id === input.lessonId);
    if (current === null || current === undefined) return missing();

    if (current.day === input.day && current.timeSlotId === input.timeSlotId) return { ok: true };

    const result = check(get, { ...current, day: input.day, timeSlotId: input.timeSlotId }, input.lessonId);
    if (!result.ok) return result;

    commit(set, get, get().lessons.map((item) => {
      if (item.id !== input.lessonId) return item;

      return { ...item, day: input.day, timeSlotId: input.timeSlotId };
    }));

    return { ok: true };
  },
  unassignLesson: (lessonId) => {
    commit(set, get, get().lessons.filter((item) => item.id !== lessonId));
  },
  editLesson: (input) => {
    const current = get().lessons.find((item) => item.id === input.lessonId);
    if (current === null || current === undefined) return missing();

    const result = check(get, { ...current, teacherId: input.teacherId, roomId: input.roomId }, input.lessonId);
    if (!result.ok) return result;

    commit(set, get, get().lessons.map((item) => {
      if (item.id !== input.lessonId) return item;

      return { ...item, teacherId: input.teacherId, roomId: input.roomId };
    }));
    get().rememberTeacher(current.sectionId, input.teacherId);

    return { ok: true };
  },
  copyLesson: (input) => {
    const current = get().lessons.find((item) => item.id === input.lessonId);
    if (current === null || current === undefined) return missing();

    // Исходное занятие остаётся в слоте, поэтому его не исключаем из проверки.
    const result = check(get, { ...current, day: input.day, timeSlotId: input.timeSlotId });
    if (!result.ok) return result;

    commit(set, get, [...get().lessons, {
      ...current,
      id: crypto.randomUUID(),
      day: input.day,
      timeSlotId: input.timeSlotId,
    }]);

    return { ok: true };
  },
  undo: () => {
    const { past, lessons, future } = get();
    const previous = past.at(-1);
    if (previous === null || previous === undefined) return;

    set({
      lessons: previous,
      past: past.slice(0, -1),
      future: [lessons, ...future],
    });
  },
  redo: () => {
    const { past, lessons, future } = get();
    const next = future[0];
    if (next === null || next === undefined) return;

    set({
      lessons: next,
      past: [...past, lessons],
      future: future.slice(1),
    });
  },
}));

function check(
  get: () => ScheduleStore,
  placement: Placement,
  excludeLessonId?: string,
): ConflictResult {
  const { catalog, lessons } = get();
  if (catalog === null || catalog === undefined) return { ok: false, kind: 'no-room', text: 'Расписание ещё не загружено' };

  return placementConflict({
    placement,
    lessons,
    sections: catalog.sections,
    rooms: catalog.rooms,
    blockedSlots: catalog.blockedSlots,
    excludeLessonId,
  });
}

function commit(
  set: (partial: Partial<ScheduleStore>) => void,
  get: () => ScheduleStore,
  lessons: Lesson[],
): void {
  const { past, lessons: current } = get();
  set({
    lessons,
    past: [...past, current].slice(-historyLimit),
    future: [],
  });
}

function missing(): ConflictResult {
  return { ok: false, kind: 'section-busy', text: 'Занятие не найдено' };
}
