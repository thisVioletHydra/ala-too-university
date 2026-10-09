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
    const directions: Record<string, SidebarDestination> = {
      ArrowUp: { kind: 'status', index: input.selectedStatus },
      ArrowDown: input.cardCount > 0 ? { kind: 'card', index: 0 } : { kind: 'unhandled' },
    };
    return directions[key] ?? { kind: 'unhandled' };
  }
  if (target.kind === 'status') {
    if (key === 'ArrowDown') return { kind: 'search' };
    const direction = horizontalDirection[key] ?? 0;
    return direction ? { kind: 'status', index: bounded(target.index + direction, input.statusCount) } : { kind: 'stay' };
  }
  if (target.kind === 'issue') {
    if (key === 'ArrowUp' && target.index === 0) {
      return input.cardCount > 0 ? { kind: 'card', index: input.cardCount - 1 } : { kind: 'search' };
    }
    const direction = verticalDirection[key] ?? 0;
    return direction ? { kind: 'issue', index: bounded(target.index + direction, input.issueCount) } : { kind: 'stay' };
  }
  return { kind: 'unhandled' };
}

const horizontalDirection: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
const verticalDirection: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 };
function bounded(index: number, count: number): number {
  return Math.max(0, Math.min(count - 1, index));
}
