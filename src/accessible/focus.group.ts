import { matchesKey } from './keyboard.bindings.ts';

const CONTROL_SELECTOR = 'button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]';

export function focusableControls(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(CONTROL_SELECTOR)).filter((element) =>
    !element.closest('[hidden], [inert], [aria-hidden="true"]') && element.getClientRects().length > 0,
  );
}

export function nextEnabledIndex(input: { current: number; count: number; direction: number; enabled?: (index: number) => boolean; }): number {
  const { current, count, direction, enabled = () => true } = input;
  if (count <= 0) return -1;

  let next = current;
  if (current < 0 || current >= count) next = direction > 0 ? -1 : 0;

  for (let step = 0; step < count; step++) {
    next = (next + direction + count) % count;
    if (enabled(next)) return next;
  }

  return -1;
}

export function focusNext(items: HTMLElement[], direction: number): void {
  const current = items.indexOf(document.activeElement as HTMLElement);
  const next = nextEnabledIndex({ current, count: items.length, direction });
  items[next]?.focus();
}

/** Tab замыкается только на границах; остальные клавиши остаются контролам. */
export function trapTab(event: KeyboardEvent, items: HTMLElement[]): void {
  if (matchesKey('switchArea', event.key) === false || event.defaultPrevented) return;

  const current = items.indexOf(document.activeElement as HTMLElement);
  const leaving = event.shiftKey ? current <= 0 : current < 0 || current === items.length - 1;
  if (leaving === false || items.length === 0) return;

  event.preventDefault();
  const destination = event.shiftKey ? items.at(-1) : items[0];
  destination?.focus();
}
