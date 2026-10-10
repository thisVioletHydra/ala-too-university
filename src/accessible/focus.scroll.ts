type Range = { start: number; end: number };

/** Крупную клетку показываем с начала, если целиком она не помещается. */
export function scrollDistance(target: Range, viewport: Range): number {
  if (target.start < viewport.start) return target.start - viewport.start;

  if (target.end <= viewport.end) return 0;

  const oversized = target.end - target.start > viewport.end - viewport.start;

  return oversized ? target.start - viewport.start : target.end - viewport.end;
}

export function revealGridTarget(node: HTMLElement, grid: HTMLElement): void {
  const bounds = grid.getBoundingClientRect();
  const corner = grid.querySelector<HTMLElement>('[data-grid-corner]')?.getBoundingClientRect();
  const target = node.getBoundingClientRect();
  const top = bounds.top + grid.clientTop;
  const left = bounds.left + grid.clientLeft;
  const padding = 8;
  const vertical = {
    start: Math.max(top, corner?.bottom ?? top) + padding,
    end: top + grid.clientHeight - padding,
  };
  const horizontal = {
    start: Math.max(left, corner?.right ?? left) + padding,
    end: left + grid.clientWidth - padding,
  };
  const deltaY = scrollDistance({ start: target.top, end: target.bottom }, vertical);
  const deltaX = scrollDistance({ start: target.left, end: target.right }, horizontal);
  if (deltaX === 0 && deltaY === 0) return;

  // Повторные стрелки не должны накапливать незавершённые плавные прокрутки.
  grid.scrollBy({ top: deltaY, left: deltaX, behavior: 'instant' });
}
