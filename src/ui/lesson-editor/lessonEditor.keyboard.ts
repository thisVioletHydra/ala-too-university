import type { KeyboardEvent } from 'react';

import { matchesKey } from '#accessible/keyboard.bindings.ts';

const CONTROL_SELECTOR = 'button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]';

/** Escape закрывает редактор, если событие ещё никто не обработал. */
export function closeOnEscape(event: KeyboardEvent<HTMLDivElement>, onClose: () => void): void {
  if (!matchesKey('cancel', event.key) || event.defaultPrevented) return;

  event.preventDefault();
  event.stopPropagation();
  if (event.repeat === false) onClose();
}

/** Стрелки ходят по полям и кнопкам: мимо удаления и мимо уже раскрытого списка. */
export function moveBetweenControls(event: KeyboardEvent<HTMLDivElement>): void {
  const modifierPressed = event.altKey || event.ctrlKey || event.metaKey;
  if (!matchesKey('navigation', event.key) || modifierPressed) return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  if (target.closest('[role="combobox"][aria-expanded="true"]')) return;

  const vertical = matchesKey('previous', event.key) || matchesKey('next', event.key);
  const controls = editorControls(event.currentTarget, vertical);
  const current = controls.indexOf(document.activeElement as HTMLElement);
  const direction = matchesKey('previous', event.key) || matchesKey('left', event.key) ? -1 : 1;

  event.preventDefault();
  event.stopPropagation();
  controls[(current + direction + controls.length) % controls.length]?.focus();
}

function editorControls(root: HTMLElement, vertical: boolean): HTMLElement[] {
  const controls = Array.from(root.querySelectorAll<HTMLElement>(CONTROL_SELECTOR))
    .filter((control) => vertical === false || control.hasAttribute('data-editor-delete') === false);
  if (vertical === false) return controls;

  // «Сохранить» встаёт сразу за «Закрыть»: стрелка вниз не должна перескакивать через удаление.
  const saveIndex = controls.findIndex((control) => control.hasAttribute('data-editor-save'));
  const closeIndex = controls.findIndex((control) => control.hasAttribute('data-editor-footer-close'));
  if (saveIndex < 0 || closeIndex < 0 || closeIndex > saveIndex) return controls;

  const [saveControl] = controls.splice(saveIndex, 1);
  controls.splice(closeIndex, 0, saveControl);

  return controls;
}
