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
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

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
  | { mode: 'edit', lessonId: string };

export type ActiveDrag =
  | { kind: 'section', sectionId: string }
  | { kind: 'lesson', lessonId: string, copy: boolean };

export type DragFace = {
  code: string
  courseId: string
  courseCode: string
  teacherName: string | null
  roomName: string | null
};

export type Hand =
  | { kind: 'section', sectionId: string }
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
  advice: Map<string, SlotAdvice>, overKey: string | null, overUnassign: boolean, ghost: ActiveDrag | null, face: DragFace | null, teacherNames: Record<string, string>, roomNames: Record<string, string>, editor: EditorRequest | null, setEditor: (editor: EditorRequest | null) => void, hold: Hold, setHold: (hold: Hold) => void, landing: Landing | null, clearLanding: () => void, dropHand: (hand: Hand, target: DropTarget) => void, skipClick: () => boolean, flash: Flash, mark: (flash: Flash) => void
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
  const [editor, setEditor] = useState<EditorRequest | null>(null);
  const [hold, setHold] = useState<Hold>(emptyHold);
  const [landing, setLanding] = useState<Landing | null>(null);
  const [flash, setFlash] = useState<Flash>(quietFlash);
  const flashTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);
  const skipClick = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const carried = active ?? handToDrag(hold.hand);
  const advice = useMemo(() => {
    return adviceMap(props.catalog, lessons, remembered, carried);
  }, [props.catalog, lessons, remembered, carried]);
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
    setHold(emptyHold);
    const data = event.active.data.current;
    if (!isRecord(data)) return;

    const copy = altKey(event.activatorEvent);
    if (data.kind === 'section' && typeof data.sectionId === 'string') {
      setActive({ kind: 'section', sectionId: data.sectionId });
    }

    if (data.kind === 'lesson' && typeof data.lessonId === 'string') {
      setActive({ kind: 'lesson', lessonId: data.lessonId, copy });
    }
  }

  function onDragOver(event: DragOverEvent): void {
    const data = event.over?.data.current;
    const dragging = event.active.data.current;
    if (!isRecord(data)) {
      setOverKey(null);
      setOverUnassign(false);

      return;
    }

    if (data.kind === 'unassign') {
      setOverKey(null);
      setOverUnassign(isRecord(dragging) && dragging.kind === 'lesson');

      return;
    }

    if (data.kind === 'slot' && isDay(data.day) && typeof data.timeSlotId === 'string') {
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

    if (data.kind === 'unassign' && current.kind === 'lesson') {
      unassignLesson(current.lessonId);

      return;
    }

    if (data.kind !== 'slot' || !isDay(data.day) || typeof data.timeSlotId !== 'string') return;

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

    if (current.copy) {
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
      aim: current.aim === 'list:return' ? '' : current.aim,
    }));
  }

  function dropHand(hand: Hand, target: DropTarget): void {
    if (target.kind === 'unassign') {
      if (hand.kind !== 'lesson') return;

      unassignLesson(hand.lessonId);
      release({ kind: 'tray' });

      return;
    }

    if (hand.kind === 'section') {
      const before = new Set(useSchedule.getState().lessons.map((item) => item.id));
      const outcome = assignLesson({
        sectionId: hand.sectionId,
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
        release({ kind: 'slot', day: target.day, timeSlotId: target.timeSlotId });

        return;
      }

      const created = useSchedule.getState().lessons.find((item) => !before.has(item.id));
      release(created
        ? { kind: 'card', lessonId: created.id }
        : { kind: 'slot', day: target.day, timeSlotId: target.timeSlotId });

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
        collisionDetection={pointerWithin}
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

function handToDrag(hand: Hand | null): ActiveDrag | null {
  if (hand === null || hand === undefined) return null;

  if (hand.kind === 'section') return { kind: 'section', sectionId: hand.sectionId };

  return { kind: 'lesson', lessonId: hand.lessonId, copy: false };
}

function adviceMap(
  catalog: ScheduleCatalog,
  lessons: ScheduleCatalog['lessons'],
  remembered: Record<string, string>,
  active: ActiveDrag | null,
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
    : section.teacherId ?? remembered[section.id] ?? null;
  const roomId = lesson ? lesson.roomId : null;
  const excludeLessonId = active.kind === 'lesson' && !active.copy ? active.lessonId : undefined;

  for (const day of catalog.weekDays) {
    for (const timeSlot of catalog.timeSlots) {
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

    const teacherId = section.teacherId ?? remembered[section.id] ?? null;

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
