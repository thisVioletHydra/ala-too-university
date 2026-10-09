import { sectionTeacher } from '#schedule/section-teacher.ts';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import type { SlotAdvice } from '#schedule/conflicts.ts';
import type { ScheduleCatalog, WeekDay } from '#schedule/types.ts';
import type { ReactNode } from 'react';

import { DndContext, PointerSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';
import { assignLesson } from '#features/assign-lesson.ts';
import { copyLesson } from '#features/copy-lesson.ts';
import { moveLesson } from '#features/move-lesson.ts';
import { unassignLesson } from '#features/unassign-lesson.ts';
import { useSchedule } from '#app/schedule.store.ts';
import { explainSlot } from '#schedule/conflicts.ts';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type EditorRequest =
  | {
    mode: 'create'
    sectionId: string
    day: WeekDay
    timeSlotId: string
    teacherId: string | null
    roomId: string | null
    text: string | null
  }
  | { mode: 'edit', lessonId: string }
  | { mode: 'section', sectionId: string };

export type ActiveDrag =
  | { kind: 'section', sectionId: string, teacherId?: string, roomId?: string }
  | { kind: 'lesson', lessonId: string, copy: boolean };

export type DragFace = {
  code: string
  courseId: string
  courseCode: string
  teacherName: string | null
  roomName: string | null
};

export type Hand =
  | { kind: 'section', sectionId: string, teacherId?: string, roomId?: string, originLessonId?: string }
  | { kind: 'lesson', lessonId: string };

export type Hold = {
  hand: Hand | null
  aim: string
  overKey: string | null
  overList: boolean
};

export type DropTarget =
  | { kind: 'unassign' }
  | { kind: 'slot', day: WeekDay, timeSlotId: string };

export type Landing =
  | { kind: 'card', lessonId: string }
  | { kind: 'slot', day: WeekDay, timeSlotId: string }
  | { kind: 'tray' };

export type Flash = {
  lessonId: string | null
  sectionId: string | null
};

const quietFlash: Flash = { lessonId: null, sectionId: null };

const emptyHold: Hold = { hand: null, aim: '', overKey: null, overList: false };

type BoardContextValue = {
  repeat: boolean, advice: Map<string, SlotAdvice>, overKey: string | null, overUnassign: boolean, ghost: ActiveDrag | null, face: DragFace | null, teacherNames: Record<string, string>, roomNames: Record<string, string>, editor: EditorRequest | null, setEditor: (editor: EditorRequest | null) => void, hold: Hold, setHold: (hold: Hold) => void, landing: Landing | null, clearLanding: () => void, dropHand: (hand: Hand, target: DropTarget) => void, skipClick: () => boolean, flash: Flash, mark: (flash: Flash) => void
};

const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoard(): BoardContextValue {
  const value = useContext(BoardContext);
  if (value === null || value === undefined) throw new Error('Нет доски');

  return value;
}

export function slotKey(day: WeekDay, timeSlotId: string): string {
  return `${day}|${timeSlotId}`;
}

export function Providers(props: { catalog: ScheduleCatalog, children: ReactNode }) {
  const lessons = useSchedule((state) => state.lessons);
  const remembered = useSchedule((state) => state.rememberedTeachers);
  const [active, setActive] = useState<ActiveDrag | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [overUnassign, setOverUnassign] = useState(false);
  const [editor, updateEditor] = useState<EditorRequest | null>(null);
  const [hold, setHold] = useState<Hold>(emptyHold);
  const [landing, setLanding] = useState<Landing | null>(null);
  const setEditor = useCallback((request: EditorRequest | null) => {
    setHold((current) => ({ ...current, hand: null, overKey: null, overList: false }));
    setActive(null);
    setOverKey(null);
    setOverUnassign(false);
    setLanding(null);
    updateEditor(request);
  }, []);
  const [flash, setFlash] = useState<Flash>(quietFlash);
  const flashTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);
  const skipClick = useRef(false);
  const leftSidebar = useRef(false);
  const repeatKey = useRef(false);
  const [repeat, setRepeat] = useState(false);

  useEffect(() => {
    function update(event: KeyboardEvent | PointerEvent): void {
      repeatKey.current = event.shiftKey;
      setRepeat(event.shiftKey);
    }

    function reset(): void {
      repeatKey.current = false;
      setRepeat(false);
    }

    window.addEventListener('keydown', update, true);
    window.addEventListener('keyup', update, true);
    window.addEventListener('pointerdown', update, true);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', update, true);
      window.removeEventListener('keyup', update, true);
      window.removeEventListener('pointerdown', update, true);
      window.removeEventListener('blur', reset);
    };
  }, []);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const carried = active ?? handToDrag(hold.hand, repeat);
  const advice = useMemo(() => {
    return adviceMap(props.catalog, lessons, remembered, carried, repeat);
  }, [props.catalog, lessons, remembered, carried, repeat]);
  const face = useMemo(() => {
    return dragFace(props.catalog, lessons, remembered, carried);
  }, [props.catalog, lessons, remembered, carried]);
  const teacherNames = useMemo(() => {
    return Object.fromEntries(props.catalog.teachers.map((teacher) => [teacher.id, teacher.shortName]));
  }, [props.catalog]);
  const roomNames = useMemo(() => {
    return Object.fromEntries(props.catalog.rooms.map((room) => [room.id, room.name]));
  }, [props.catalog]);

  function onDragStart(event: DragStartEvent): void {
    leftSidebar.current = false;
    setHold(emptyHold);
    const data = event.active.data.current;
    if (!isRecord(data)) return;

    const copy = altKey(event.activatorEvent) || repeatKey.current;
    if (data.kind === 'section' && typeof data.sectionId === 'string') {
      setActive({ kind: 'section', sectionId: data.sectionId });
    }

    if (data.kind === 'lesson' && typeof data.lessonId === 'string') {
      setActive({ kind: 'lesson', lessonId: data.lessonId, copy });
    }
  }

  function onDragOver(event: DragOverEvent): void {
    const sidebar = document.getElementById('sections-panel');
    if (sidebar && event.activatorEvent instanceof MouseEvent) {
      const bounds = sidebar.getBoundingClientRect();
      const x = event.activatorEvent.clientX + event.delta.x;
      const y = event.activatorEvent.clientY + event.delta.y;
      if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) leftSidebar.current = true;
    }

    const data = event.over?.data.current;
    if (!isRecord(data)) {
      setOverKey(null);
      setOverUnassign(false);

      return;
    }

    if (data.kind === 'unassign') {
      setOverKey(null);
      const dragging = event.active.data.current;
      setOverUnassign(isRecord(dragging) && (dragging.kind === 'lesson' || leftSidebar.current));

      return;
    }

    if (data.kind === 'slot' && isDay(data.day) && typeof data.timeSlotId === 'string') {
      leftSidebar.current = true;
      setOverUnassign(false);
      setOverKey(slotKey(data.day, data.timeSlotId));
    }
  }

  function onDragEnd(event: DragEndEvent): void {
    skipClick.current = true;
    window.setTimeout(() => {
      skipClick.current = false;
    }, 0);
    const data = event.over?.data.current;
    const current = active;
    setActive(null);
    setOverKey(null);
    setOverUnassign(false);
    if (!current || !isRecord(data)) return;

    if (data.kind === 'card-action' && current.kind === 'lesson' && data.lessonId === current.lessonId) {
      if (data.action === 'edit') setEditor({ mode: 'edit', lessonId: current.lessonId });
      else if (data.action === 'delete') unassignLesson(current.lessonId);
      return;
    }

    if (data.kind === 'unassign') {
      if (current.kind === 'lesson') unassignLesson(current.lessonId);

      return;
    }

    if (data.kind !== 'slot' || !isDay(data.day) || typeof data.timeSlotId !== 'string') return;

    if (current.kind === 'lesson' && !repeatKey.current && !current.copy) {
      const cell = document.querySelector<HTMLElement>(`[data-slot="${CSS.escape(slotKey(data.day, data.timeSlotId))}"]`);
      const reorderTarget = cell?.dataset.reorderTarget;
      if (reorderTarget) {
        useSchedule.getState().swapLessons(current.lessonId, reorderTarget);
        return;
      }
    }

    if (repeatKey.current && removeMatching(current, { kind: 'slot', day: data.day, timeSlotId: data.timeSlotId })) return;

    if (current.kind === 'section') {
      const outcome = assignLesson({
        sectionId: current.sectionId,
        day: data.day,
        timeSlotId: data.timeSlotId,
      });
      if (outcome.type === 'edit') {
        setEditor({
          mode: 'create',
          sectionId: current.sectionId,
          day: data.day,
          timeSlotId: data.timeSlotId,
          teacherId: outcome.teacherId,
          roomId: outcome.roomId,
          text: outcome.text,
        });
      }

      return;
    }

    if (current.copy || repeatKey.current) {
      if (repeatKey.current) {
        const source = useSchedule.getState().lessons.find((item) => item.id === current.lessonId);
        if (source === null || source === undefined) return;

        const outcome = assignLesson({ sectionId: source.sectionId, teacherId: source.teacherId, day: data.day, timeSlotId: data.timeSlotId });
        if (outcome.type === 'edit') {
          setEditor({ mode: 'create', sectionId: source.sectionId, day: data.day, timeSlotId: data.timeSlotId, teacherId: outcome.teacherId, roomId: outcome.roomId, text: outcome.text });
        }

        return;
      }

      copyLesson({ lessonId: current.lessonId, day: data.day, timeSlotId: data.timeSlotId });

      return;
    }

    const lesson = useSchedule.getState().lessons.find((item) => item.id === current.lessonId);
    if (lesson?.day === data.day && lesson.timeSlotId === data.timeSlotId) return;

    moveLesson({ lessonId: current.lessonId, day: data.day, timeSlotId: data.timeSlotId });
  }

  function mark(next: Flash): void {
    setFlash(next);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(quietFlash), 700);
  }

  function release(next: Landing): void {
    setLanding(next);
    setHold((current) => ({
      ...current,
      hand: null,
      overKey: null,
      overList: false,
      // Карточка ушла в нераспределённые — курсор держать не на чем, иначе
      // на слоте остаётся висеть пунктирная рамка.
      aim: next.kind === 'tray' || current.aim === 'list:return' ? '' : current.aim,
    }));
  }

  function removeMatching(hand: Hand, target: Extract<DropTarget, { kind: 'slot' }>): boolean {
    const lessons = useSchedule.getState().lessons;
    const source = hand.kind === 'lesson' ? lessons.find((item) => item.id === hand.lessonId) : null;
    const sectionId = hand.kind === 'section' ? hand.sectionId : source?.sectionId;
    const existing = lessons.find((item) => item.sectionId === sectionId && item.day === target.day && item.timeSlotId === target.timeSlotId);
    if (!existing) return false;

    if (source && source.id === existing.id && hold.hand) {
      setHold((current) => ({ ...current, hand: { kind: 'section', sectionId: source.sectionId, teacherId: source.teacherId, roomId: source.roomId, originLessonId: source.id } }));
    }

    unassignLesson(existing.id);

    return true;
  }

  function dropHand(hand: Hand, target: DropTarget): void {
    if (target.kind === 'unassign') {
      if (hand.kind === 'section') {
        setLanding(null);
        setHold(emptyHold);
        window.requestAnimationFrame(() => {
          document.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(hand.sectionId)}"]`)?.focus();
        });
      } else {
        unassignLesson(hand.lessonId);
        release({ kind: 'tray' });
      }

      return;
    }

    const originId = hand.kind === 'lesson' ? hand.lessonId : hand.originLessonId;
    const origin = useSchedule.getState().lessons.find((item) => item.id === originId);
    if (!repeatKey.current && origin?.day === target.day && origin.timeSlotId === target.timeSlotId) {
      setHold((current) => ({ ...current, hand: null, overKey: null, overList: false }));

      return;
    }

    if (repeatKey.current && removeMatching(hand, target)) return;

    if (hand.kind === 'section') {
      const before = new Set(useSchedule.getState().lessons.map((item) => item.id));
      const outcome = assignLesson({
        sectionId: hand.sectionId,
        teacherId: hand.teacherId,
        roomId: repeatKey.current ? undefined : hand.roomId,
        day: target.day,
        timeSlotId: target.timeSlotId,
      });
      if (outcome.type === 'rejected') return;

      if (outcome.type === 'edit') {
        setEditor({
          mode: 'create',
          sectionId: hand.sectionId,
          day: target.day,
          timeSlotId: target.timeSlotId,
          teacherId: outcome.teacherId,
          roomId: outcome.roomId,
          text: outcome.text,
        });
        if (repeatKey.current === null || repeatKey.current === undefined) release({ kind: 'slot', day: target.day, timeSlotId: target.timeSlotId });

        return;
      }

      const created = useSchedule.getState().lessons.find((item) => !before.has(item.id));
      if (repeatKey.current) {
        if (created) {
          setHold((current) => ({ ...current, hand: { kind: 'section', sectionId: created.sectionId, teacherId: created.teacherId, originLessonId: hand.originLessonId } }));
          mark({ lessonId: created.id, sectionId: hand.sectionId });
        }

        return;
      }

      release(created
        ? { kind: 'card', lessonId: created.id }
        : { kind: 'slot', day: target.day, timeSlotId: target.timeSlotId });

      return;
    }

    if (repeatKey.current) {
      const source = useSchedule.getState().lessons.find((item) => item.id === hand.lessonId);
      if (source === null || source === undefined) return;

      const before = new Set(useSchedule.getState().lessons.map((item) => item.id));
      const outcome = assignLesson({ sectionId: source.sectionId, teacherId: source.teacherId, day: target.day, timeSlotId: target.timeSlotId });
      if (outcome.type === 'edit') {
        setEditor({ mode: 'create', sectionId: source.sectionId, day: target.day, timeSlotId: target.timeSlotId, teacherId: outcome.teacherId, roomId: outcome.roomId, text: outcome.text });
      }

      if (outcome.type === 'placed') {
        const created = useSchedule.getState().lessons.find((item) => !before.has(item.id));
        if (created) {
          setHold((current) => ({ ...current, hand: { kind: 'section', sectionId: created.sectionId, teacherId: created.teacherId, originLessonId: source.id } }));
          mark({ lessonId: created.id, sectionId: created.sectionId });
        }
      }

      return;
    }

    const outcome = moveLesson({
      lessonId: hand.lessonId,
      day: target.day,
      timeSlotId: target.timeSlotId,
    });
    if (!outcome.ok) return;

    release({ kind: 'card', lessonId: hand.lessonId });
  }

  const overKeyShown = active ? overKey : hold.overKey;
  const overUnassignShown = active ? overUnassign : hold.overList;

  return (
    <BoardContext.Provider value={{
      repeat,
      advice,
      overKey: overKeyShown,
      overUnassign: overUnassignShown,
      ghost: active,
      face,
      teacherNames,
      roomNames,
      editor,
      setEditor,
      hold,
      setHold,
      landing,
      clearLanding: () => setLanding(null),
      dropHand,
      skipClick: () => skipClick.current,
      flash,
      mark,
    }}>
      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const hits = pointerWithin(args);
          const action = hits.find((hit) => String(hit.id).startsWith('card-action:'));
          return action ? [action] : hits;
        }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActive(null);
          setOverKey(null);
          setOverUnassign(false);
        }}
      >
        {props.children}
      </DndContext>
    </BoardContext.Provider>
  );
}

function handToDrag(hand: Hand | null, copy: boolean): ActiveDrag | null {
  if (hand === null || hand === undefined) return null;

  if (hand.kind === 'section') return { ...hand };

  return { kind: 'lesson', lessonId: hand.lessonId, copy };
}

function adviceMap(
  catalog: ScheduleCatalog,
  lessons: ScheduleCatalog['lessons'],
  remembered: Record<string, string>,
  active: ActiveDrag | null,
  repeat: boolean,
): Map<string, SlotAdvice> {
  const map = new Map<string, SlotAdvice>();
  if (!active) return map;

  const lesson = active.kind === 'lesson'
    ? lessons.find((item) => item.id === active.lessonId)
    : null;
  const sectionId = active.kind === 'section' ? active.sectionId : lesson?.sectionId;
  const section = catalog.sections.find((item) => item.id === sectionId);
  if (section === null || section === undefined) return map;

  const teacherId = lesson
    ? lesson.teacherId
    : active.kind === 'section' ? sectionTeacher(section, lessons, remembered) : null;
  const roomId = repeat ? null : lesson ? lesson.roomId : active.kind === 'section' ? active.roomId ?? null : null;
  const excludeLessonId = active.kind === 'lesson' && !active.copy && !repeat ? active.lessonId : undefined;

  for (const day of catalog.weekDays) {
    for (const timeSlot of catalog.timeSlots) {
      if (repeat && lessons.some((item) => item.sectionId === section.id && item.day === day.id && item.timeSlotId === timeSlot.id)) {
        map.set(slotKey(day.id, timeSlot.id), { ok: true, text: 'Убрать', teacherId, roomId, needsChoice: false });
        continue;
      }

      map.set(slotKey(day.id, timeSlot.id), explainSlot({
        section,
        day: day.id,
        timeSlotId: timeSlot.id,
        lessons,
        rooms: catalog.rooms,
        sections: catalog.sections,
        blockedSlots: catalog.blockedSlots,
        teacherId,
        roomId,
        excludeLessonId,
      }));
    }
  }

  return map;
}

function dragFace(
  catalog: ScheduleCatalog,
  lessons: ScheduleCatalog['lessons'],
  remembered: Record<string, string>,
  active: ActiveDrag | null,
): DragFace | null {
  if (!active) return null;

  if (active.kind === 'section') {
    const section = catalog.sections.find((item) => item.id === active.sectionId);
    if (section === null || section === undefined) return null;

    const teacherId = sectionTeacher(section, lessons, remembered);

    return {
      code: section.code,
      courseId: section.courseId,
      courseCode: courseCode(catalog, section.courseId),
      teacherName: teacherId ? catalog.teachers.find((item) => item.id === teacherId)?.shortName ?? null : null,
      roomName: null,
    };
  }

  const lesson = lessons.find((item) => item.id === active.lessonId);
  const section = catalog.sections.find((item) => item.id === lesson?.sectionId);
  if (!lesson || !section) return null;

  return {
    code: section.code,
    courseId: section.courseId,
    courseCode: courseCode(catalog, section.courseId),
    teacherName: catalog.teachers.find((item) => item.id === lesson.teacherId)?.shortName ?? null,
    roomName: catalog.rooms.find((item) => item.id === lesson.roomId)?.name ?? null,
  };
}

function courseCode(catalog: ScheduleCatalog, courseId: string): string {
  return catalog.courses.find((course) => course.id === courseId)?.code ?? '';
}

function altKey(event: Event | null): boolean {
  if (event instanceof MouseEvent) return event.altKey;

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDay(value: unknown): value is WeekDay {
  return value === 'MON' || value === 'TUE' || value === 'WED' || value === 'THU' || value === 'FRI';
}
