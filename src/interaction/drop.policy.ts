import type { Lesson } from '#schedule/types.ts';
import type { Hand, DropTarget } from './types.ts';

export type DropDecision =
  | { kind: 'cancel' }
  | { kind: 'return-section'; sectionId: string }
  | { kind: 'remove'; lessonId: string }
  | { kind: 'assign'; sectionId: string }
  | { kind: 'copy'; lessonId: string; sectionId: string }
  | { kind: 'move'; lessonId: string }
  | { kind: 'missing-source' };

type DropInput = { hand: Hand; target: DropTarget; lessons: Lesson[]; copyMode: boolean };

export function decideDrop(input: DropInput): DropDecision {
  const { hand, target, lessons, copyMode } = input;
  if (target.kind === 'unassign') {
    return hand.kind === 'section'
      ? { kind: 'return-section', sectionId: hand.sectionId }
      : { kind: 'remove', lessonId: hand.lessonId };
  }

  const originId = hand.kind === 'lesson' ? hand.lessonId : hand.originLessonId;
  const origin = lessons.find((lesson) => lesson.id === originId);
  const sameSlot = origin?.day === target.day && origin.timeSlotId === target.timeSlotId;
  if (sameSlot && !copyMode) return { kind: 'cancel' };

  const sectionId = hand.kind === 'section' ? hand.sectionId : origin?.sectionId;
  if (sectionId === undefined) return { kind: 'missing-source' };

  if (copyMode) {
    const matching = lessons.find((lesson) => (
      lesson.sectionId === sectionId
      && lesson.day === target.day
      && lesson.timeSlotId === target.timeSlotId
    ));
    if (matching) return { kind: 'remove', lessonId: matching.id };
  }

  if (hand.kind === 'section') return { kind: 'assign', sectionId };

  return copyMode
    ? { kind: 'copy', lessonId: hand.lessonId, sectionId }
    : { kind: 'move', lessonId: hand.lessonId };
}
