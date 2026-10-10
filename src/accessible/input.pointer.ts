import type { InputMethod } from './keyboard.bindings.ts';

import { isPointerIntent } from './input.method.ts';

type PointerSample = {
  primary: boolean;
  eventType: string;
  x: number;
  y: number;
  movementX: number;
  movementY: number;
};

export function acceptsPointer(input: InputMethod, sample: PointerSample): boolean {
  const hasPosition = sample.x !== 0 || sample.y !== 0;
  const intent = isPointerIntent({
    isPrimary: sample.primary,
    type: sample.eventType,
    movementX: sample.movementX,
    movementY: sample.movementY,
  });
  return sample.primary && hasPosition && (input === 'pointer' || intent);
}
