import type { HandKeyContext, Zone } from './hand.types.ts';

import { matchesKey } from '#accessible/keyboard.bindings.ts';
import { isOriginalSlot, lessonAtTarget, lessonPosition } from './hand.targets.ts';

export function placeHand(context: HandKeyContext, place: Zone): void {
  const { event, input, board, hand, list, day, slot, keyboardRef, seekRef, publish } = context;
  if (!matchesKey('place', event.key) && !(matchesKey('edit', event.key) && place === 'list')) return;

  if (event.repeat) return;

  event.preventDefault();
  keyboardRef.current = true;

  if (place === 'list') {
    if (hand === null) {
      const section = input.sections[list];
      if (section === null || section === undefined) return;

      seekRef.current = true;
      publish({
        zone: 'grid',
        list,
        day,
        slot,
        hand: { kind: 'section', sectionId: section.id },
        focus: false,
      });

      return;
    }

    if (hand.kind === 'lesson') {
      board.dropHand(hand, { kind: 'unassign' });

      return;
    }

    publish({ zone: 'list', list, day, slot, hand: null, focus: true });

    return;
  }

  if (hand === null) {
    const lesson = lessonAtTarget(input.lessons, input.days, input.slots, day, slot, event.target);
    if (lesson === null) return;

    // Курсор переезжает в клетку взятой карточки, иначе пунктир цели остаётся
    // там, где он был до этого, и не совпадает с тем, что мы держим в руке.
    const from = lessonPosition(lesson, input.days, input.slots) ?? { day, slot };

    publish({
      zone: 'grid',
      list,
      day: from.day,
      slot: from.slot,
      hand: { kind: 'lesson', lessonId: lesson.id },
      focus: true,
    });

    return;
  }

  const dayId = input.days[day];
  const slotId = input.slots[slot];
  if (!dayId || !slotId) return;

  if (hand.kind === 'lesson' && !event.shiftKey && isOriginalSlot(input.lessons, hand.lessonId, dayId, slotId)) {
    publish({ zone: 'grid', list, day, slot, hand: null, focus: true });

    return;
  }

  board.dropHand(hand, { kind: 'slot', day: dayId, timeSlotId: slotId });
}
