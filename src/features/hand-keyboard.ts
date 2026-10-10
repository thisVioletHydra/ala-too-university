import type { useBoard } from '#app/providers.tsx';
import type { MutableRefObject } from 'react';
import type { Hand } from '#interaction/types.ts';
import type { HandInput, HandStep, Zone } from '#features/hand-types.ts';

import { navigateSidebar } from '#accessible/sidebar-navigation.ts';
import { hasCommandModifier, matchesKey } from '#accessible/keyboard.bindings.ts';
import { navigationPermissions } from '#interaction/input-policy.ts';
import { keyboardGrid } from '#accessible/keyboard-grid.ts';
import { keyboardSlot } from '#accessible/keyboard-slot.ts';
import { unassignLesson } from '#features/unassign-lesson.ts';
import { isArrow, isHome, lessonAt, lessonSlot, typing, zoneOf } from '#features/hand-targets.ts';
import { slotKey } from '#interaction/slot-key.ts';

type Board = ReturnType<typeof useBoard>;

export type HandKeyContext = {
  event: KeyboardEvent
  input: HandInput
  board: Board
  hand: Hand | null
  zone: Zone
  list: number
  day: number
  slot: number
  keys: MutableRefObject<boolean>
  seek: MutableRefObject<boolean>
  publish: (next: HandStep) => void
};

/** Маршрутизация клавиш в сетке и списке: решает, что сделать, и зовёт publish. */
export function handleHandKey(context: HandKeyContext): void {
  const { event, input, board, hand, zone, list, day, slot, keys, seek, publish } = context;

  if (event.defaultPrevented) return;

  if (hasCommandModifier(event)) return;

  const permissions = navigationPermissions({
    composing: event.isComposing,
    shiftPressed: event.shiftKey,
    sidebarHidden: input.listHidden,
    carrying: hand !== null,
    dragging: board.ghost !== null,
    editing: board.editor !== null,
    landing: board.landing !== null,
    repeated: event.repeat,
  });

  const sidebarArrow = isArrow(event.key) && permissions.sidebar;
  if (sidebarArrow && event.target instanceof HTMLElement) {
    const destination = navigateSidebar(event.target, event.key, input.sections.length);
    if (destination.kind !== 'unhandled') {
      event.preventDefault();
      if (destination.kind === 'card') {
        keys.current = true;
        publish({ zone: 'list', list: destination.index, day, slot, hand: null, focus: true });
      }

      return;
    }
  }

  if (typing(event.target)) return;

  const place = zoneOf(event.target);

  if (isArrow(event.key) && place === null) {
    if (permissions.recoverFocus === null || permissions.recoverFocus === undefined) return;

    if (document.querySelector('dialog[open], [role="dialog"], [role="listbox"], [popover]:popover-open')) return;

    const target = event.target;
    if (target instanceof Element && target.closest('button, a[href], input, textarea, select, [contenteditable], [tabindex], [role="button"], [role="combobox"], [role="menu"], [role="slider"], [role="spinbutton"], [role="tablist"]')) return;

    const first = document.querySelector<HTMLElement>('[data-section-scroll] [data-section-id]');
    if (!first || first.closest('[inert], [hidden]') || first.getClientRects().length === 0) return;

    event.preventDefault();
    keys.current = true;
    publish({ zone: 'list', list: 0, day, slot, hand: null, focus: true });

    return;
  }

  if (matchesKey('switchArea', event.key)) {
    if (input.listHidden) return;

    const here = place ?? (hand ? zone : null);
    if (here === null || here === undefined) return;

    event.preventDefault();
    keys.current = true;
    const nextZone = here === 'list' ? 'grid' : 'list';
    const land = nextZone === 'grid' && hand !== null;
    if (land) seek.current = true;

    publish({
      zone: nextZone,
      list,
      day,
      slot,
      hand,
      focus: !land,
    });

    return;
  }

  if (matchesKey('cancel', event.key) && hand) {
    event.preventDefault();
    keys.current = true;
    seek.current = false;
    const fromList = hand.kind === 'section' && !hand.originLessonId && !input.listHidden;
    const sectionId = hand.kind === 'section' ? hand.sectionId : null;
    const sourceIndex = fromList ? input.sections.findIndex((section) => section.id === sectionId) : -1;
    publish({ zone: fromList ? 'list' : zone, list: sourceIndex >= 0 ? sourceIndex : list, day, slot, hand: null, focus: true });
    window.dispatchEvent(new Event('schedule:cancel-hand'));

    return;
  }

  if (matchesKey('remove', event.key) && hand?.kind === 'lesson') {
    if (event.repeat) return;

    event.preventDefault();
    board.dropHand(hand, { kind: 'unassign' });

    return;
  }

  if (matchesKey('remove', event.key) && place === 'grid' && !hand) {
    event.preventDefault();
    if (event.repeat || board.ghost) return;

    const cell = event.target instanceof Element ? event.target.closest('[data-slot]') : null;
    const key = cell?.getAttribute('data-slot');
    if (key === null || key === undefined) return;

    const items = input.lessons.filter((lesson) => slotKey(lesson.day, lesson.timeSlotId) === key);
    if (items.length !== 1) return;

    unassignLesson(items[0].id);

    return;
  }

  if (place === null || place === undefined) return;

  if (isArrow(event.key)) {
    event.preventDefault();
    keys.current = true;
    if (place === 'list') {
      if (matchesKey('next', event.key) && list === input.sections.length - 1 && !hand) {
        const issue = document.querySelector<HTMLButtonElement>('#sections-panel footer button');
        if (issue) {
          issue.focus();

          return;
        }
      }

      if (matchesKey('previous', event.key) && list === 0 && !hand) {
        document.getElementById('section-search')?.focus();

        return;
      }

      publish({
        zone: 'list',
        list: keyboardSlot(list, event.key, input.sections.length),
        day,
        slot,
        hand,
        focus: true,
      });

      return;
    }

    const next = keyboardGrid({ day, slot }, event.key, input.days.length, input.slots.length);
    publish({ zone: 'grid', list, day: next.day, slot: next.slot, hand, focus: true });

    return;
  }

  if (matchesKey('edit', event.key) && hand) {
    event.preventDefault();
    if (event.repeat) return;

    if (hand.kind === 'lesson') {
      board.setEditor({ mode: 'edit', lessonId: hand.lessonId });
    } else {
      const dayId = input.days[day];
      const slotId = input.slots[slot];
      if (!dayId || !slotId) return;

      const advice = board.advice.get(slotKey(dayId, slotId));
      board.setEditor({ mode: 'create', sectionId: hand.sectionId, day: dayId, timeSlotId: slotId, teacherId: advice?.teacherId ?? null, roomId: advice?.roomId ?? null, text: advice?.text ?? null });
    }

    publish({ zone, list, day, slot, hand: null, focus: false });

    return;
  }

  if (matchesKey('edit', event.key) && place === 'grid') {
    const lesson = lessonAt(input.lessons, input.days, input.slots, day, slot, event.target);
    if (lesson === null || lesson === undefined) return;

    event.preventDefault();
    board.setEditor({ mode: 'edit', lessonId: lesson.id });

    return;
  }

  if (!matchesKey('place', event.key) && !(matchesKey('edit', event.key) && place === 'list')) return;

  if (event.repeat) return;

  event.preventDefault();
  keys.current = true;

  if (place === 'list') {
    if (hand === null || hand === undefined) {
      const section = input.sections[list];
      if (section === null || section === undefined) return;

      seek.current = true;
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

  if (hand === null || hand === undefined) {
    const lesson = lessonAt(input.lessons, input.days, input.slots, day, slot, event.target);
    if (lesson === null || lesson === undefined) return;

      // Курсор переезжает в клетку взятой карточки, иначе пунктир цели остаётся
      // там, где он был до этого, и не совпадает с тем, что мы держим в руке.
    const from = lessonSlot(lesson, input.days, input.slots) ?? { day, slot };

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

  if (hand.kind === 'lesson' && !event.shiftKey && isHome(input.lessons, hand.lessonId, dayId, slotId)) {
    publish({ zone: 'grid', list, day, slot, hand: null, focus: true });

    return;
  }

  board.dropHand(hand, { kind: 'slot', day: dayId, timeSlotId: slotId });
}
