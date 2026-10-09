import type { SlotAdvice } from '#schedule/conflicts.ts';
import type { Lesson, WeekDay } from '#schedule/types.ts';
import type { Hand } from '#app/providers.tsx';

import { keyboardGrid } from '#accessible/keyboard-grid.ts';
import { keyboardSlot } from '#accessible/keyboard-slot.ts';
import { unassignLesson } from '#features/unassign-lesson.ts';
import { slotKey, useBoard } from '#app/providers.tsx';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';

type Zone = 'list' | 'grid';

type HandInput = {
  listHidden: boolean
  sections: { id: string }[]
  days: WeekDay[]
  slots: string[]
  lessons: Lesson[]
};

type HandStep = {
  zone: Zone
  list: number
  day: number
  slot: number
  hand: Hand | null
  focus: boolean
};

export function useHand(input: HandInput) {
  const board = useBoard();
  const [zone, setZone] = useState<Zone>('list');
  const [listIndex, setListIndex] = useState(0);
  const [cursor, setCursor] = useState({ day: 0, slot: 0 });
  const [armed, setArmed] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const keys = useRef(false);
  const seek = useRef(false);
  const leftList = useRef(false);
  const hand = board.hold.hand;

  const list = input.sections.length === 0 ? 0 : Math.min(listIndex, input.sections.length - 1);
  const day = input.days.length === 0 ? 0 : Math.min(cursor.day, input.days.length - 1);
  const slot = input.slots.length === 0 ? 0 : Math.min(cursor.slot, input.slots.length - 1);

  function publish(next: HandStep): void {
    if (next.hand !== hand) leftList.current = false;

    const dayId = input.days[next.day];
    const slotId = input.slots[next.slot];
    const key = dayId && slotId ? slotKey(dayId, slotId) : '';
    const returning = next.hand !== null && next.zone === 'list';
    setZone(next.zone);
    setListIndex(next.list);
    setCursor({ day: next.day, slot: next.slot });
    setArmed(true);
    board.setHold({
      hand: next.hand,
      aim: returning ? 'list:return' : next.zone === 'list' ? `list:${next.list}` : key,
      overKey: next.hand && next.zone === 'grid' ? key : null,
      overList: returning,
    });
    if (next.focus) setFocusTick((tick) => tick + 1);
  }

  useEffect(() => {
    if (focusTick === 0) return;

    const node = document.querySelector('[data-aim="yes"]');
    if (!(node instanceof HTMLElement)) return;

    node.focus({ preventScroll: true });
    const list = node.closest<HTMLElement>('[data-section-scroll]');
    if (!list || !node.matches('[data-section-id]')) {
      node.scrollIntoView({ block: 'nearest', inline: 'nearest' });

      return;
    }

    const previous = node.previousElementSibling;
    const start = previous?.matches('[data-section-group]') ? previous : node;
    const viewport = list.getBoundingClientRect();
    const top = start.getBoundingClientRect().top;
    const bottom = node.getBoundingClientRect().bottom;
    const padding = 8;
    let delta = 0;
    if (bottom > viewport.bottom - padding) delta = bottom - viewport.bottom + padding;

    if (top < viewport.top + padding) delta = top - viewport.top - padding;

    if (delta !== 0) {
      list.scrollTo({
        top: list.scrollTop + delta,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    }
  }, [focusTick]);

  useLayoutEffect(() => {
    if (!seek.current || hand === null || zone !== 'grid') return;

    seek.current = false;
    const fit = firstOpen(input.days, input.slots, input.lessons, board.advice) ?? { day, slot };
    publish({ zone: 'grid', list, day: fit.day, slot: fit.slot, hand, focus: true });
  }, [hand, zone, board.advice]);

  useEffect(() => {
    function onPointer(event: PointerEvent): void {
      if (!keys.current || !event.isPrimary) return;

      if (event.type === 'pointermove' && event.movementX === 0 && event.movementY === 0) return;

      keys.current = false;
    }

    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('pointermove', onPointer);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (isArrow(event.key) && !event.isComposing && !event.shiftKey && !input.listHidden && !hand && !board.ghost && !board.editor && event.target instanceof HTMLElement) {
      const target = event.target;
      const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('#sections-panel header button'));
      const issues = Array.from(document.querySelectorAll<HTMLButtonElement>('#sections-panel footer button'));
      const tabIndex = tabs.indexOf(target as HTMLButtonElement);
      const issueIndex = issues.indexOf(target as HTMLButtonElement);
      if (target.id === 'section-search' && event.key === 'ArrowUp') {
        event.preventDefault();
        (tabs.find((tab) => tab.getAttribute('aria-pressed') === 'true') ?? tabs[0])?.focus();
        return;
      }
      if (tabIndex >= 0) {
        event.preventDefault();
        if (event.key === 'ArrowDown') document.getElementById('section-search')?.focus();
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') tabs[Math.max(0, Math.min(tabs.length - 1, tabIndex + (event.key === 'ArrowRight' ? 1 : -1)))]?.focus();
        return;
      }
      if (issueIndex >= 0) {
        event.preventDefault();
        if (event.key === 'ArrowUp' && issueIndex === 0) {
          if (input.sections.length) publish({ zone: 'list', list: input.sections.length - 1, day, slot, hand: null, focus: true });
          else document.getElementById('section-search')?.focus();
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          issues[Math.max(0, Math.min(issues.length - 1, issueIndex + (event.key === 'ArrowDown' ? 1 : -1)))]?.focus();
        }
        return;
      }
    }

    if (event.key === 'ArrowDown' && event.target instanceof HTMLElement && event.target.id === 'section-search') {
      if (event.isComposing || event.shiftKey || input.listHidden || input.sections.length === 0 || hand || board.ghost || board.editor) return;
      event.preventDefault();
      keys.current = true;
      publish({ zone: 'list', list: 0, day, slot, hand: null, focus: true });
      return;
    }

    if (typing(event.target)) return;

    const place = zoneOf(event.target);

    if (isArrow(event.key) && place === null) {
      if (event.repeat || event.shiftKey || input.listHidden || hand || board.ghost || board.landing || board.editor) return;
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

    if (event.key === 'Tab') {
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

    if (event.key === 'Escape' && hand) {
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

    if ((event.key === 'Delete' || event.key === 'Backspace') && hand?.kind === 'lesson') {
      if (event.repeat) return;

      event.preventDefault();
      board.dropHand(hand, { kind: 'unassign' });

      return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && place === 'grid' && !hand) {
      event.preventDefault();
      if (event.repeat || board.ghost) return;
      const cell = event.target instanceof Element ? event.target.closest('[data-slot]') : null;
      const key = cell?.getAttribute('data-slot');
      if (!key) return;
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
        if (event.key === 'ArrowDown' && list === input.sections.length - 1 && !hand) {
          const issue = document.querySelector<HTMLButtonElement>('#sections-panel footer button');
          if (issue) {
            issue.focus();
            return;
          }
        }
        if (event.key === 'ArrowUp' && list === 0 && !hand) {
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

    if (event.key === 'Enter' && hand) {
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

    if (event.key === 'Enter' && place === 'grid') {
      const lesson = lessonAt(input.lessons, input.days, input.slots, day, slot, event.target);
      if (lesson === null || lesson === undefined) return;

      event.preventDefault();
      board.setEditor({ mode: 'edit', lessonId: lesson.id });

      return;
    }

    if (event.key !== ' ' && event.key !== 'Spacebar' && !(event.key === 'Enter' && place === 'list')) return;

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
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return {
    listIndex: list,
    dayIndex: day,
    slotIndex: slot,
    grabSection: (sectionId: string, index: number) => {
      publish({
        zone: 'grid',
        list: index,
        day,
        slot,
        hand: { kind: 'section', sectionId },
        focus: true,
      });
    },
    grabLesson: (lessonId: string, dayIndex: number, slotIndex: number) => {
      publish({
        zone: 'grid',
        list,
        day: dayIndex,
        slot: slotIndex,
        hand: { kind: 'lesson', lessonId },
        focus: true,
      });
    },
    enter: (next: Zone) => {
      if (next === 'list' && hand?.kind === 'section' && !keys.current && !leftList.current) return;

      if (next === zone && armed) return;

      publish({ zone: next, list, day, slot, hand, focus: false });
    },
    pointGrid: (dayIndex: number, slotIndex: number) => {
      if (keys.current || !hand || board.ghost) return;

      if (zone === 'grid' && day === dayIndex && slot === slotIndex) return;

      publish({ zone: 'grid', list, day: dayIndex, slot: slotIndex, hand, focus: false });
    },
    focusGrid: (dayIndex: number, slotIndex: number) => {
      if (zone === 'grid' && day === dayIndex && slot === slotIndex && armed) return;

      keys.current = true;
      publish({ zone: 'grid', list, day: dayIndex, slot: slotIndex, hand, focus: false });
    },
    pointList: () => {
      if (keys.current || !hand || board.ghost) return;

      if (hand.kind === 'section' && !leftList.current) return;

      if (zone === 'list' && board.hold.overList) return;

      publish({ zone: 'list', list, day, slot, hand, focus: false });
    },
    leaveList: () => {
      if (hand && !board.ghost) leftList.current = true;
    },
    dropAt: (dayIndex: number, slotIndex: number) => {
      if (!hand || board.ghost) return;

      const dayId = input.days[dayIndex];
      const slotId = input.slots[slotIndex];
      if (!dayId || !slotId) return;

      if (hand.kind === 'lesson' && !board.repeat && isHome(input.lessons, hand.lessonId, dayId, slotId)) {
        publish({ zone: 'grid', list, day: dayIndex, slot: slotIndex, hand: null, focus: true });

        return;
      }

      board.dropHand(hand, { kind: 'slot', day: dayId, timeSlotId: slotId });
    },
  };
}

function firstOpen(
  days: WeekDay[],
  slots: string[],
  lessons: Lesson[],
  advice: Map<string, SlotAdvice>,
): { day: number, slot: number } | null {
  let fallback: { day: number, slot: number } | null = null;
  for (let slot = 0; slot < slots.length; slot++) {
    for (let day = 0; day < days.length; day++) {
      const dayId = days[day];
      const slotId = slots[slot];
      if (!dayId || !slotId) continue;

      const item = advice.get(slotKey(dayId, slotId));
      if (!item?.ok) continue;

      const occupied = lessons.some((lesson) => lesson.day === dayId && lesson.timeSlotId === slotId);
      if (occupied === null || occupied === undefined) return { day, slot };

      if (fallback === null || fallback === undefined) fallback = { day, slot };
    }
  }

  return fallback;
}

function isHome(lessons: Lesson[], lessonId: string, dayId: WeekDay, slotId: string): boolean {
  const lesson = lessons.find((item) => item.id === lessonId);
  return lesson?.day === dayId && lesson.timeSlotId === slotId;
}

function lessonAt(
  lessons: Lesson[],
  days: WeekDay[],
  slots: string[],
  day: number,
  slot: number,
  target: EventTarget | null,
): Lesson | null {
  if (target instanceof Element) {
    const id = target.closest('[data-lesson-id]')?.getAttribute('data-lesson-id');
    if (id) return lessons.find((item) => item.id === id) ?? null;
  }

  const dayId = days[day];
  const slotId = slots[slot];
  if (!dayId || !slotId) return null;

  return lessons.find((item) => item.day === dayId && item.timeSlotId === slotId) ?? null;
}

function lessonSlot(
  lesson: Lesson,
  days: WeekDay[],
  slots: string[],
): { day: number, slot: number } | null {
  const day = days.indexOf(lesson.day);
  const slot = slots.indexOf(lesson.timeSlotId);
  if (day < 0 || slot < 0) return null;

  return { day, slot };
}

function zoneOf(target: EventTarget | null): Zone | null {
  if (!(target instanceof Element)) return null;

  if (target.closest('[data-keyboard-zone="grid"]')) return 'grid';

  if (target.closest('[data-keyboard-zone="list"]')) return 'list';

  return null;
}

function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (target.closest('[role="dialog"]')) return true;

  const tag = target.tagName;

  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function isArrow(key: string): boolean {
  return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight';
}
