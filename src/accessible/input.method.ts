import type { InputMethod } from './keyboard.bindings.ts';

import { isInteractionKey } from './keyboard.bindings.ts';

/** Незаметное движение указателя не должно сбрасывать клавиатурное управление. */
export function isPointerIntent(event: Pick<PointerEvent, 'isPrimary' | 'type' | 'movementX' | 'movementY'>): boolean {
  return event.isPrimary && (event.type === 'pointerdown' || Math.hypot(event.movementX, event.movementY) >= 6);
}

type InputListener = (method: InputMethod) => void;
const listeners = new Set<InputListener>();

function onKey(event: KeyboardEvent): void {
  if (!event.isComposing && isInteractionKey(event.key)) notify('keyboard');
}

function onPointer(event: PointerEvent): void {
  if (isPointerIntent(event)) notify('pointer');
}

function notify(method: InputMethod): void {
  for (const listener of listeners) listener(method);
}

export function subscribeInputMethod(listener: InputListener): () => void {
  if (listeners.size === 0) {
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('pointermove', onPointer);
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;

    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('pointerdown', onPointer);
    window.removeEventListener('pointermove', onPointer);
  };
}
