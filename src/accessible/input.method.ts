import type { InputMethod } from './keyboard.bindings.ts';

import { isInteractionKey } from './keyboard.bindings.ts';

/** Незаметное движение указателя не должно сбрасывать клавиатурное управление. */
export function isPointerIntent(event: Pick<PointerEvent, 'isPrimary' | 'type' | 'movementX' | 'movementY'>): boolean {
  return event.isPrimary && (event.type === 'pointerdown' || Math.hypot(event.movementX, event.movementY) >= 6);
}

export function subscribeInputMethod(onChange: (method: InputMethod) => void): () => void {
  function onKey(event: KeyboardEvent): void {
    if (!event.isComposing && isInteractionKey(event.key)) onChange('keyboard');
  }

  function onPointer(event: PointerEvent): void {
    if (isPointerIntent(event)) onChange('pointer');
  }

  window.addEventListener('keydown', onKey, true);
  window.addEventListener('pointerdown', onPointer);
  window.addEventListener('pointermove', onPointer);
  return () => {
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('pointerdown', onPointer);
    window.removeEventListener('pointermove', onPointer);
  };
}
