import { focusableControls, trapTab } from './focus.group.ts';

/** Сценарий выбирает цель возврата; механизм управляет только фокусом окна. */
export function bindDialogFocus(input: { root: HTMLElement; initial?: HTMLElement | null; restore: () => void; }): () => void {
  const { root, initial, restore } = input;
  const frame = window.requestAnimationFrame(() => {
    (initial ?? focusableControls(root)[0])?.focus({ preventScroll: true });
  });
  function onKeyDown(event: KeyboardEvent): void {
    trapTab(event, focusableControls(root));
  }

  root.addEventListener('keydown', onKeyDown);
  return () => {
    window.cancelAnimationFrame(frame);
    root.removeEventListener('keydown', onKeyDown);
    window.requestAnimationFrame(restore);
  };
}

export function restoreFocus(previous: Element | null, fallback: HTMLElement | null): void {
  const canRestorePrevious = previous instanceof HTMLElement && previous.isConnected
    && previous.closest('[hidden], [inert], dialog:not([open])') === null;
  const target = canRestorePrevious ? previous : fallback;
  if (!target?.isConnected || target.closest('[hidden], [inert], dialog:not([open])')) return;

  target.focus({ preventScroll: true });
}
