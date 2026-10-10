export type KeyboardZone = 'grid' | 'list';

export function targetZone(target: EventTarget | null): KeyboardZone | null {
  if (!(target instanceof Element)) return null;

  if (target.closest('[data-keyboard-zone="grid"]')) return 'grid';

  if (target.closest('[data-keyboard-zone="list"]')) return 'list';

  return null;
}

export function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (target.closest('[role="dialog"]')) return true;

  const tag = target.tagName;

  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}


export function hasOpenPopup(): boolean {
  return document.querySelector('dialog[open], [role="dialog"], [role="listbox"], [popover]:popover-open') !== null;
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button, a[href], input, textarea, select, [contenteditable], [tabindex], [role="button"], [role="combobox"], [role="menu"], [role="slider"], [role="spinbutton"], [role="tablist"]') !== null;
}
