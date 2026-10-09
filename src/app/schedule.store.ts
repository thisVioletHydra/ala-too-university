import type { ConflictResult, Lesson, LessonEdit, LessonMove, Placement, ScheduleCatalog } from '#schedule/types.ts';

import { placementConflict } from '#schedule/conflicts.ts';
import { sectionAssignmentConflict } from '#schedule/section-assignment.ts';
import { create } from 'zustand';

const historyLimit = 40;
const previousSchedule: Partial<ScheduleStore> = import.meta.hot?.data.schedule ?? {};

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
  assignSectionTeacher: (sectionId: string, teacherId: string) => ConflictResult
  placeLesson: (placement: Placement) => ConflictResult
  moveLesson: (input: LessonMove) => ConflictResult
  unassignLesson: (lessonId: string) => void
  clearLessons: () => void
  swapLessons: (firstId: string, secondId: string) => void
  editLesson: (input: LessonEdit) => ConflictResult
  copyLesson: (input: LessonMove) => ConflictResult
  undo: () => void
  redo: () => void
};

export const useSchedule = create<ScheduleStore>((set, get) => ({
  catalog: previousSchedule.catalog ?? null,
  dataset: previousSchedule.dataset ?? 'mock',
  lessons: previousSchedule.lessons ?? [],
  past: previousSchedule.past ?? [],
  future: previousSchedule.future ?? [],
  rememberedTeachers: previousSchedule.rememberedTeachers ?? {},
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
  assignSectionTeacher: (sectionId, teacherId) => {
    const section = get().catalog?.sections.find((item) => item.id === sectionId);
    if (section === null || section === undefined) return missing();

    if (teacherId && !section.allowedTeacherIds.includes(teacherId)) return { ok: false, kind: 'teacher-not-allowed', text: 'Преподаватель не ведёт эту секцию' };

    const next = get().lessons.map((item) => item.sectionId === sectionId ? { ...item, teacherId } : item);
    const result = checkSection(get, next, sectionId, teacherId);
    if (!result.ok) return result;

    if (next.some((item) => item.sectionId === sectionId)) commit(set, get, next);

    get().rememberTeacher(sectionId, teacherId);

    return { ok: true };
  },
  placeLesson: (placement) => {
    const next = get().lessons.map((item) => item.sectionId === placement.sectionId ? { ...item, teacherId: placement.teacherId } : item);
    next.push({ ...placement, id: crypto.randomUUID() });
    const result = checkSection(get, next, placement.sectionId);
    if (!result.ok) return result;

    commit(set, get, next);
    get().rememberTeacher(placement.sectionId, placement.teacherId);

    return { ok: true };
  },
  moveLesson: (input) => {
    const current = get().lessons.find((item) => item.id === input.lessonId);
    if (current === null || current === undefined) return missing();

    if (current.day === input.day && current.timeSlotId === input.timeSlotId) return { ok: true };

    const result = check(get, { ...current, day: input.day, timeSlotId: input.timeSlotId }, input.lessonId);
    if (!result.ok) return result;

    commit(set, get, [
      ...get().lessons.filter((item) => item.id !== input.lessonId),
      { ...current, day: input.day, timeSlotId: input.timeSlotId },
    ]);

    return { ok: true };
  },
  unassignLesson: (lessonId) => {
    commit(set, get, get().lessons.filter((item) => item.id !== lessonId));
  },
  clearLessons: () => {
    if (get().lessons.length === 0) return;

    commit(set, get, []);
  },
  swapLessons: (firstId, secondId) => {
    const lessons = [...get().lessons];
    const first = lessons.findIndex((item) => item.id === firstId);
    const second = lessons.findIndex((item) => item.id === secondId);
    if (first < 0 || second < 0 || first === second) return;

    if (lessons[first].day !== lessons[second].day || lessons[first].timeSlotId !== lessons[second].timeSlotId) return;

    [lessons[first], lessons[second]] = [lessons[second], lessons[first]];
    commit(set, get, lessons);
  },
  editLesson: (input) => {
    const current = get().lessons.find((item) => item.id === input.lessonId);
    if (current === null || current === undefined) return missing();

    const next = get().lessons.map((item) => item.sectionId === current.sectionId ? {
      ...item,
      teacherId: input.teacherId,
      roomId: item.id === input.lessonId ? input.roomId : item.roomId,
    } : item);
    const result = checkSection(get, next, current.sectionId);
    if (!result.ok) return result;

    commit(set, get, next);
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

if (import.meta.hot) {
  import.meta.hot.dispose((data) => {
    const { catalog, dataset, lessons, past, future, rememberedTeachers } = useSchedule.getState();
    data.schedule = { catalog, dataset, lessons, past, future, rememberedTeachers };
  });
}

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

function checkSection(get: () => ScheduleStore, lessons: Lesson[], sectionId: string, assignedTeacherId?: string): ConflictResult {
  const catalog = get().catalog;
  if (catalog === null || catalog === undefined) return { ok: false, kind: 'no-room', text: 'Расписание ещё не загружено' };

  return sectionAssignmentConflict({ catalog, lessons, sectionId, teacherId: assignedTeacherId, rememberedTeachers: get().rememberedTeachers });
}
