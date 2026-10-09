import type { InputMethod } from './keyboard.ts';
import type { Landing } from './types.ts';

export type CursorState =
  | { phase: 'idle' }
  | { phase: 'holding'; input: InputMethod }
  | { phase: 'paused' }
  | { phase: 'placing'; target: Landing; token: number }
  | { phase: 'returning'; token: number };

type CursorContext = {
  editing: boolean;
  carrying: boolean;
  input: InputMethod;
  landing: Landing | null;
  token: number;
};

// Priority is explicit: editor > held card > landing animation > idle.
export function resolveCursorState(context: CursorContext): CursorState {
  if (context.editing) return { phase: 'paused' };

  if (context.carrying) return { phase: 'holding', input: context.input };

  if (context.landing === null || context.landing === undefined) return { phase: 'idle' };

  return context.landing.kind === 'tray'
    ? { phase: 'returning', token: context.token }
    : { phase: 'placing', target: context.landing, token: context.token };
}

export function ownsAnimation(state: CursorState, token: number): boolean {
  const animating = state.phase === 'placing' || state.phase === 'returning';
  return animating && state.token === token;
}
