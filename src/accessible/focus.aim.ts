import { useEffect } from 'react';
import { revealGridTarget } from './focus.scroll.ts';

/** Держит цель клавиатуры в поле зрения: соседние группы не должны уезжать за край. */
export function useAimFocus(focusTick: number): void {
  useEffect(() => {
    if (focusTick === 0) return;

    const node = document.querySelector('[data-aim="yes"]');
    if (!(node instanceof HTMLElement)) return;

    node.focus({ preventScroll: true });
    const grid = node.closest<HTMLElement>('[data-keyboard-zone="grid"]');
    if (grid) {
      revealGridTarget(node, grid);

      return;
    }

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
}
