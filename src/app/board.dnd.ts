import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ActiveDrag, DropTarget, EditorRequest, Hand, Hold } from '#interaction/types.ts';

import { announce } from '#accessible/reader.announcements.ts';
import { emptyHold } from '#interaction/types.ts';
import { assignLesson } from '#features/lesson.assign.ts';
import { altKey, isDay, isRecord } from '#app/board.derived.ts';
import { isOutsideBounds } from '#interaction/bounds.ts';
import { slotKey } from '#interaction/slot.key.ts';
import { useSchedule } from '#app/schedule.store.ts';

type DndDeps = {
  active: ActiveDrag | null
  repeatKey: MutableRefObject<boolean>
  leftSidebar: MutableRefObject<boolean>
  skipClick: MutableRefObject<boolean>
  setActive: (value: ActiveDrag | null) => void
  setOverKey: (value: string | null) => void
  setOverUnassign: (value: boolean) => void
  setHold: Dispatch<SetStateAction<Hold>>
  setEditor: (request: EditorRequest | null) => void
  removeMatching: (hand: Hand, target: Extract<DropTarget, { kind: 'slot' }>) => boolean
};

/** Применение решений dnd-kit: состояние доски меняется только здесь. */
export function useDndHandlers(deps: DndDeps) {
  const { active, repeatKey, leftSidebar, skipClick, setActive, setOverKey, setOverUnassign, setHold, setEditor, removeMatching } = deps;

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
      if (isOutsideBounds(bounds, x, y)) leftSidebar.current = true;
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
      else if (data.action === 'delete') useSchedule.getState().unassignLesson(current.lessonId);

      return;
    }

    if (data.kind === 'unassign') {
      if (current.kind === 'lesson') useSchedule.getState().unassignLesson(current.lessonId);

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

    if (current.kind === 'section' || repeatKey.current) {
      const source = current.kind === 'lesson'
        ? useSchedule.getState().lessons.find((lesson) => lesson.id === current.lessonId)
        : current;
      if (source === null || source === undefined) return;

      const outcome = assignLesson({
        sectionId: source.sectionId,
        teacherId: source.teacherId,
        roomId: source.roomId,
        day: data.day,
        timeSlotId: data.timeSlotId,
      });
      if (outcome.type === 'rejected') announce(outcome.text);

      if (outcome.type === 'edit') {
        setEditor({
          mode: 'create',
          sectionId: source.sectionId,
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
      const outcome = useSchedule.getState().copyLesson({ lessonId: current.lessonId, day: data.day, timeSlotId: data.timeSlotId });
      if (outcome.ok === false) announce(outcome.text);

      return;
    }

    const lesson = useSchedule.getState().lessons.find((item) => item.id === current.lessonId);
    if (lesson?.day === data.day && lesson.timeSlotId === data.timeSlotId) return;

    const outcome = useSchedule.getState().moveLesson({ lessonId: current.lessonId, day: data.day, timeSlotId: data.timeSlotId });
    if (outcome.ok === false) announce(outcome.text);
  }

  return { onDragStart, onDragOver, onDragEnd };
}
