import { matchesKey } from '#accessible/keyboard.bindings.ts';

export type SidebarTarget =
  | { kind: 'search' }
  | { kind: 'status'; index: number }
  | { kind: 'issue'; index: number }
  | { kind: 'other' };

export type SidebarDestination =
  | { kind: 'search' }
  | { kind: 'status'; index: number }
  | { kind: 'issue'; index: number }
  | { kind: 'card'; index: number }
  | { kind: 'stay' }
  | { kind: 'unhandled' };

type SidebarInput = {
  target: SidebarTarget;
  key: string;
  selectedStatus: number;
  statusCount: number;
  issueCount: number;
  cardCount: number;
};

export function sidebarDestination(input: SidebarInput): SidebarDestination {
  const { target, key } = input;
  if (target.kind === 'search') {
    if (matchesKey('previous', key)) return { kind: 'status', index: input.selectedStatus };

    if (matchesKey('next', key) && input.cardCount > 0) return { kind: 'card', index: 0 };

    return { kind: 'unhandled' };
  }

  if (target.kind === 'status') {
    if (matchesKey('next', key)) return { kind: 'search' };

    const direction = navigationDirection(key, 'horizontal');

    return direction ? { kind: 'status', index: bounded(target.index + direction, input.statusCount) } : { kind: 'stay' };
  }

  if (target.kind === 'issue') {
    if (matchesKey('previous', key) && target.index === 0) {
      return input.cardCount > 0 ? { kind: 'card', index: input.cardCount - 1 } : { kind: 'search' };
    }

    const direction = navigationDirection(key, 'vertical');

    return direction ? { kind: 'issue', index: bounded(target.index + direction, input.issueCount) } : { kind: 'stay' };
  }

  return { kind: 'unhandled' };
}

function navigationDirection(key: string, axis: 'horizontal' | 'vertical'): number {
  const backward = axis === 'horizontal' ? 'left' : 'previous';
  const forward = axis === 'horizontal' ? 'right' : 'next';
  if (matchesKey(backward, key)) return -1;

  return matchesKey(forward, key) ? 1 : 0;
}

function bounded(index: number, count: number): number {
  return Math.max(0, Math.min(count - 1, index));
}
