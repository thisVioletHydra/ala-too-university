import type { DropAnimation } from '@dnd-kit/core';

import { isOverSidebar } from '#ui/drag-ghost/dragGhost.geometry.ts';

/**
 * Возврат оверлея после Drop: если карточка уже встала на место, оверлей гасится
 * без полёта; иначе он доезжает до своей клетки и там исчезает.
 */
export const dropAnimation: DropAnimation = ({ active, dragOverlay }) => {
  if (isOverSidebar(dragOverlay.rect, active.data.current?.kind)) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const data = active.data.current;
  const placed = data?.kind === 'lesson' && !data.copy && typeof data.lessonId === 'string'
    ? document.querySelector<HTMLElement>(`[data-lesson-id="${CSS.escape(data.lessonId)}"]`)
    : null;
  const opacity = placed?.style.opacity ?? '';
  const transition = placed?.style.transition ?? '';
  if (placed) {
    placed.style.transition = 'none';
    placed.style.opacity = '0';
  }

  const target = placed?.getBoundingClientRect();
  const transform = getComputedStyle(dragOverlay.node).transform;
  const position = transform === 'none' ? '' : transform;
  const frames = target
    ? [{ transform: position || 'none', opacity: 1 }, { transform: `translate3d(${target.left - dragOverlay.rect.left}px, ${target.top - dragOverlay.rect.top}px, 0) ${position}`, opacity: 1 }]
    : [{ opacity: 1 }, { opacity: 0 }];
  const animation = dragOverlay.node.animate(frames, { duration: 160, easing: 'ease-out', fill: 'forwards' });

  return new Promise<void>((resolve) => {
    function finish(): void {
      dragOverlay.node.style.visibility = 'hidden';
      if (placed) {
        placed.style.opacity = opacity;
        placed.getBoundingClientRect();
        placed.style.transition = transition;
      }

      resolve();
    }

    animation.onfinish = finish;
    animation.oncancel = finish;
  });
};
