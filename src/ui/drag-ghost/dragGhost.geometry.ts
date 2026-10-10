import type { ActiveDrag, Hand, Landing } from '#interaction/types.ts';

import { isInsideBounds } from '#interaction/bounds.ts';
import { slotKey } from '#app/providers.tsx';

type GhostBox = {
  left: number
  top: number
  width: number
};

/** Оверлей секции над боковой панелью: это возврат в список, dropAnimation не нужна. */
export function isOverSidebar(rect: { left: number; top: number; width: number; height: number }, kind: unknown): boolean {
  if (kind !== 'section') return false;

  const sidebar = document.getElementById('sections-panel')?.getBoundingClientRect();
  if (sidebar === undefined) return false;

  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  return isInsideBounds(sidebar, x, y);
}

/** Полёт к цели невозможен: нечего показывать или анимация отключена системно. */
export function cannotFly(returning: boolean, target: GhostBox | null): boolean {
  if (!returning && target === null) return true;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function landingBox(landing: Landing): { left: number, top: number, width: number } | null {
  if (landing.kind === 'card') {
    const node = document.querySelector(`[data-lesson-id="${CSS.escape(landing.lessonId)}"]`);

    return node instanceof HTMLElement ? plainBox(node) : null;
  }

  if (landing.kind === 'slot') {
    const node = document.querySelector(`[data-slot="${CSS.escape(slotKey(landing.day, landing.timeSlotId))}"]`);

    return node instanceof HTMLElement ? insetBox(node) : null;
  }

  const tray = document.querySelector('[data-tray]');

  return tray instanceof HTMLElement ? plainBox(tray) : null;
}

export function plainBox(node: HTMLElement): { left: number, top: number, width: number } {
  const rect = node.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width };
}

export function insetBox(node: HTMLElement): { left: number, top: number, width: number } {
  const rect = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  const padStart = Number.parseFloat(style.paddingInlineStart);
  const padEnd = Number.parseFloat(style.paddingInlineEnd);
  const padTop = Number.parseFloat(style.paddingBlockStart);

  return {
    left: rect.left + padStart,
    top: rect.top + padTop,
    width: rect.width - padStart - padEnd,
  };
}

export function placeAt(element: HTMLElement, x: number, y: number): void {
  placeWithinViewport(element, x + 16, y - 16);
}

export function placeAim(element: HTMLElement): void {
  const aim = document.querySelector('[data-aim="yes"]');
  if (!(aim instanceof HTMLElement)) return;

  const rect = aim.getBoundingClientRect();
  if (aim.matches('[data-section-scroll]')) {
    const top = Math.max(8, rect.top);
    const bottom = Math.min(window.innerHeight - 8, rect.bottom);
    placeWithinViewport(element, rect.left + (rect.width - element.offsetWidth) / 2, top + (bottom - top) / 2 + 24);

    return;
  }

  placeWithinViewport(element, rect.right - element.offsetWidth * 0.4, rect.bottom - 24);
}

export function placeWithinViewport(element: HTMLElement, left: number, top: number): void {
  const x = Math.max(8, Math.min(left, window.innerWidth - element.offsetWidth - 8));
  const y = Math.max(8, Math.min(top, window.innerHeight - element.offsetHeight - 8));
  element.style.transform = `translate(${x}px, ${y}px)`;
}

export function heldDrag(hand: Hand): ActiveDrag {
  if (hand.kind === 'section') return { ...hand };

  return { kind: 'lesson', lessonId: hand.lessonId, copy: false };
}

export function sourceNode(hand: Hand): HTMLElement | null {
  const selector = hand.kind === 'lesson'
    ? `[data-lesson-id="${CSS.escape(hand.lessonId)}"]`
    : `[data-section-id="${CSS.escape(hand.sectionId)}"]`;
  const node = document.querySelector(selector);
  return node instanceof HTMLElement ? node : null;
}

/** Ширина первой клетки сетки: по ней выравнивается превью секции. */
export function firstSlotWidth(): number | undefined {
  const cell = document.querySelector('[data-slot]');

  return cell instanceof HTMLElement ? insetBox(cell).width : undefined;
}
