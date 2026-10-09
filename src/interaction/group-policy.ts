import type { Hand } from './types.ts';
import { matchesKey } from './keyboard.ts';

export type GroupView = 'single' | 'pair' | 'strips';
export type GroupCommand = 'ignore' | 'open-picker' | 'focus-first' | 'reorder-up' | 'reorder-down' | 'confirm-order';

type GroupContext = {
  lessonIds: string[];
  hand: Hand | null;
  dragging: boolean;
  copyMode: boolean;
  key: string;
  cellTarget: boolean;
};

export function groupView(count: number): GroupView {
  if (count >= 3) return 'strips';
  return count === 2 ? 'pair' : 'single';
}

export function groupCommand(context: GroupContext): GroupCommand {
  const view = groupView(context.lessonIds.length);
  if (context.dragging || view === 'single') return 'ignore';
  if (!context.hand) {
    const opens = matchesKey('edit', context.key) || matchesKey('place', context.key);
    if (!context.cellTarget || !opens) return 'ignore';
    return view === 'strips' ? 'open-picker' : 'focus-first';
  }
  const movingPair = view === 'pair' && context.hand.kind === 'lesson' && !context.copyMode;
  if (!movingPair) return 'ignore';
  if (context.hand.kind !== 'lesson' || !context.lessonIds.includes(context.hand.lessonId)) return 'ignore';
  const reorderKeys: Record<string, GroupCommand> = {
    ArrowUp: 'reorder-up', ArrowDown: 'reorder-down', ' ': 'confirm-order', Spacebar: 'confirm-order',
  };
  return reorderKeys[context.key] ?? 'ignore';
}

export type PickerState = 'closed' | 'selecting' | 'suspended-for-editor';
export function pickerState(open: boolean, editing: boolean): PickerState {
  if (!open) return 'closed';
  return editing ? 'suspended-for-editor' : 'selecting';
}
