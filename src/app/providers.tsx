import type { SlotAdvice } from '#schedule/conflicts.ts';
import type { ScheduleCatalog } from '#schedule/types.ts';
import type { ReactNode } from 'react';
import type { EditorRequest, ActiveDrag, DragFace, Hand, Hold, DropTarget, Landing, Flash } from '#interaction/types.ts';

import { adviceMap, dragFace, handToDrag } from '#app/board-derived.ts';
import { emptyHold, quietFlash } from '#interaction/types.ts';
import { decideDrop } from '#interaction/drop.policy.ts';
import { DndContext, PointerSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';
import { assignLesson } from '#features/lesson.assign.ts';
import { useDndHandlers } from '#app/use-dnd-handlers.ts';
import { useSchedule } from '#app/schedule.store.ts';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type { EditorRequest, ActiveDrag, DragFace, Hand, Hold, DropTarget, Landing, Flash } from '#interaction/types.ts';
export { slotKey } from '#interaction/slot.key.ts';

type BoardContextValue = {
  repeat: boolean, advice: Map<string, SlotAdvice>, overKey: string | null, overUnassign: boolean, ghost: ActiveDrag | null, face: DragFace | null, teacherNames: Record<string, string>, roomNames: Record<string, string>, editor: EditorRequest | null, setEditor: (editor: EditorRequest | null) => void, hold: Hold, setHold: (hold: Hold) => void, landing: Landing | null, clearLanding: () => void, dropHand: (hand: Hand, target: DropTarget) => void, skipClick: () => boolean, flash: Flash, mark: (flash: Flash) => void
};

const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoard(): BoardContextValue {
  const value = useContext(BoardContext);
  if (value === null || value === undefined) throw new Error('Нет доски');

  return value;
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

    useSchedule.getState().unassignLesson(existing.id);

    return true;
  }

  function dropHand(hand: Hand, target: DropTarget): void {
    const decision = decideDrop({ hand, target, lessons: useSchedule.getState().lessons, copyMode: repeatKey.current });
    if (decision.kind === 'missing-source') return;

    if (target.kind === 'unassign') {
      if (hand.kind === 'section') {
        setLanding(null);
        setHold(emptyHold);
        window.requestAnimationFrame(() => {
          document.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(hand.sectionId)}"]`)?.focus();
        });
      } else {
        useSchedule.getState().unassignLesson(hand.lessonId);
        release({ kind: 'tray' });
      }

      return;
    }

    if (decision.kind === 'cancel') {
      setHold((current) => ({ ...current, hand: null, overKey: null, overList: false }));

      return;
    }

    if (decision.kind === 'remove' && removeMatching(hand, target)) return;

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
        if (repeatKey.current === false) release({ kind: 'slot', day: target.day, timeSlotId: target.timeSlotId });

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

    const outcome = useSchedule.getState().moveLesson({
      lessonId: hand.lessonId,
      day: target.day,
      timeSlotId: target.timeSlotId,
    });
    if (!outcome.ok) return;

    release({ kind: 'card', lessonId: hand.lessonId });
  }

  const overKeyShown = active ? overKey : hold.overKey;
  const overUnassignShown = active ? overUnassign : hold.overList;

  const { onDragStart, onDragOver, onDragEnd } = useDndHandlers({
    active,
    repeatKey,
    leftSidebar,
    skipClick,
    setActive,
    setOverKey,
    setOverUnassign,
    setHold,
    setEditor,
    removeMatching,
  });

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
