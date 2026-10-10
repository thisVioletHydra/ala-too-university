import type { HandKeyContext, Zone } from './hand.types.ts';

import { matchesKey } from '#accessible/keyboard.bindings.ts';
import { useSchedule } from '#app/schedule.store.ts';
import { lessonAtTarget } from './hand.targets.ts';
import { slotKey } from '#interaction/slot.key.ts';

export function handleHandCommand(context: HandKeyContext, place: Zone | null): boolean {
  const { event, input, board, hand, zone, list, day, slot, keyboardRef, seekRef, publish } = context;
  if (matchesKey('switchArea', event.key)) {
    if (input.listHidden) return true;

    const here = place ?? (hand ? zone : null);
    if (here === null) return true;

    event.preventDefault();
    keyboardRef.current = true;
    const nextZone = here === 'list' ? 'grid' : 'list';
    const land = nextZone === 'grid' && hand !== null;
    if (land) seekRef.current = true;

    publish({
      zone: nextZone,
      list,
      day,
      slot,
      hand,
      focus: !land,
    });

    return true;
  }

  if (matchesKey('cancel', event.key) && hand) {
    event.preventDefault();
    keyboardRef.current = true;
    seekRef.current = false;
    const fromList = hand.kind === 'section' && !hand.originLessonId && !input.listHidden;
    const sectionId = hand.kind === 'section' ? hand.sectionId : null;
    const sourceIndex = fromList ? input.sections.findIndex((section) => section.id === sectionId) : -1;
    publish({ zone: fromList ? 'list' : zone, list: sourceIndex >= 0 ? sourceIndex : list, day, slot, hand: null, focus: true });
    window.dispatchEvent(new Event('schedule:cancel-hand'));

    return true;
  }

  if (matchesKey('remove', event.key) && hand?.kind === 'lesson') {
    if (event.repeat) return true;

    event.preventDefault();
    board.dropHand(hand, { kind: 'unassign' });

    return true;
  }

  if (matchesKey('remove', event.key) && place === 'grid' && !hand) {
    event.preventDefault();
    if (event.repeat || board.ghost) return true;

    const cell = event.target instanceof Element ? event.target.closest('[data-slot]') : null;
    const key = cell?.getAttribute('data-slot');
    if (key === null || key === undefined) return true;

    const items = input.lessons.filter((lesson) => slotKey(lesson.day, lesson.timeSlotId) === key);
    if (items.length !== 1) return true;

    useSchedule.getState().unassignLesson(items[0].id);

    return true;
  }

  if (matchesKey('edit', event.key) && hand) {
    event.preventDefault();
    if (event.repeat) return true;

    if (hand.kind === 'lesson') {
      board.setEditor({ mode: 'edit', lessonId: hand.lessonId });
    } else {
      const dayId = input.days[day];
      const slotId = input.slots[slot];
      if (!dayId || !slotId) return true;

      const advice = board.advice.get(slotKey(dayId, slotId));
      board.setEditor({
        mode: 'create',
        sectionId: hand.sectionId,
        day: dayId,
        timeSlotId: slotId,
        teacherId: advice?.teacherId ?? null,
        roomId: advice?.roomId ?? null,
        text: advice?.text ?? null,
      });
    }

    publish({ zone, list, day, slot, hand: null, focus: false });

    return true;
  }

  if (matchesKey('edit', event.key) && place === 'grid') {
    const lesson = lessonAtTarget(input.lessons, input.days, input.slots, day, slot, event.target);
    if (lesson === null) return true;

    event.preventDefault();
    board.setEditor({ mode: 'edit', lessonId: lesson.id });

    return true;
  }

  return false;
}
