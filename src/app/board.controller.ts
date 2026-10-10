import type { ScheduleCatalog } from '#schedule/types.ts';
import type { EditorRequest, ActiveDrag, Hold, Landing } from '#interaction/types.ts';

import { adviceMap, dragFace, handToDrag } from '#app/board.derived.ts';
import { emptyHold } from '#interaction/types.ts';
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useBoardTransfer } from './board.transfer.ts';
import { useDndHandlers } from '#app/board.dnd.ts';
import { useSchedule } from '#app/schedule.store.ts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useBoardController(catalog: ScheduleCatalog) {
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
    return adviceMap(catalog, lessons, remembered, carried, repeat);
  }, [catalog, lessons, remembered, carried, repeat]);
  const face = useMemo(() => {
    return dragFace(catalog, lessons, remembered, carried);
  }, [catalog, lessons, remembered, carried]);
  const teacherNames = useMemo(() => {
    return Object.fromEntries(catalog.teachers.map((teacher) => [teacher.id, teacher.shortName]));
  }, [catalog]);
  const roomNames = useMemo(() => {
    return Object.fromEntries(catalog.rooms.map((room) => [room.id, room.name]));
  }, [catalog]);

  const { flash, mark, dropHand, removeMatching } = useBoardTransfer({ hold, setHold, setLanding, setEditor, repeatKey });

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

  function cancelDrag(): void {
    setActive(null);
    setOverKey(null);
    setOverUnassign(false);
  }

  return {
    value: {
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
    },
    dnd: { sensors, onDragStart, onDragOver, onDragEnd, onDragCancel: cancelDrag },
  };
}
