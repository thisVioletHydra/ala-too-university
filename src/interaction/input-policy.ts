import type { InputMethod } from './keyboard.ts';

export type PointerSample = {
  primary: boolean;
  eventType: string;
  x: number;
  y: number;
  movementX: number;
  movementY: number;
};

export function acceptsPointer(input: InputMethod, sample: PointerSample): boolean {
  const hasPosition = sample.x !== 0 || sample.y !== 0;
  const incidentalMovement = sample.eventType === 'pointermove'
    && input === 'keyboard'
    && Math.hypot(sample.movementX, sample.movementY) < 6;
  return sample.primary && hasPosition && !incidentalMovement;
}

export type NavigationContext = {
  composing: boolean;
  shiftPressed: boolean;
  sidebarHidden: boolean;
  carrying: boolean;
  dragging: boolean;
  editing: boolean;
  landing: boolean;
  repeated: boolean;
};

export function navigationPermissions(context: NavigationContext): { sidebar: boolean; recoverFocus: boolean } {
  const busy = context.carrying || context.dragging || context.editing;
  const unavailable = context.composing || context.shiftPressed || context.sidebarHidden;
  const sidebar = !busy && !unavailable;
  return { sidebar, recoverFocus: sidebar && !context.landing && !context.repeated };
}
