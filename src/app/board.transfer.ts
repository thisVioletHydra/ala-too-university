import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { EditorRequest, Hand, Hold, DropTarget, Landing, Flash } from '#interaction/types.ts';

import { announce } from '#accessible/reader.announcements.ts';
import { emptyHold, quietFlash } from '#interaction/types.ts';
import { decideDrop } from '#interaction/drop.policy.ts';
import { assignLesson } from '#features/lesson.assign.ts';
import { useSchedule } from './schedule.store.ts';
import { useEffect, useRef, useState } from 'react';

type TransferDependencies = {
  hold: Hold;
  setHold: Dispatch<SetStateAction<Hold>>;
  setLanding: (landing: Landing | null) => void;
  setEditor: (editor: EditorRequest | null) => void;
  repeatKey: RefObject<boolean>;
};

export function useBoardTransfer({ hold, setHold, setLanding, setEditor, repeatKey }: TransferDependencies) {
  const [flash, setFlash] = useState<Flash>(quietFlash);
  const flashTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

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

    let placementHand = hand;
    if (hand.kind === 'lesson' && repeatKey.current) {
      const source = useSchedule.getState().lessons.find((lesson) => lesson.id === hand.lessonId);
      if (source === null || source === undefined) return;

      placementHand = {
        kind: 'section',
        sectionId: source.sectionId,
        teacherId: source.teacherId,
        roomId: source.roomId,
        originLessonId: source.id,
      };
    }

    if (placementHand.kind === 'section') {
      const before = new Set(useSchedule.getState().lessons.map((item) => item.id));
      const outcome = assignLesson({
        sectionId: placementHand.sectionId,
        teacherId: placementHand.teacherId,
        roomId: placementHand.roomId,
        day: target.day,
        timeSlotId: target.timeSlotId,
      });
      if (outcome.type === 'rejected') {
        announce(outcome.text);

        return;
      }

      if (outcome.type === 'edit') {
        setEditor({
          mode: 'create',
          sectionId: placementHand.sectionId,
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
          setHold((current) => ({ ...current, hand: { kind: 'section', sectionId: created.sectionId, teacherId: created.teacherId, roomId: created.roomId, originLessonId: placementHand.originLessonId } }));
          mark({ lessonId: created.id, sectionId: placementHand.sectionId });
        }

        return;
      }

      release(created
        ? { kind: 'card', lessonId: created.id }
        : { kind: 'slot', day: target.day, timeSlotId: target.timeSlotId });

      return;
    }

    const outcome = useSchedule.getState().moveLesson({
      lessonId: placementHand.lessonId,
      day: target.day,
      timeSlotId: target.timeSlotId,
    });
    if (outcome.ok === false) {
      announce(outcome.text);

      return;
    }

    release({ kind: 'card', lessonId: placementHand.lessonId });
  }

  return { flash, mark, dropHand, removeMatching };
}
