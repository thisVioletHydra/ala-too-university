import type { Hand } from './types.ts';

import { matchesAnyKey, matchesKey } from '#accessible/keyboard.bindings.ts';

type GroupView = 'single' | 'pair' | 'strips';
type GroupCommand = 'ignore' | 'open-picker' | 'focus-first' | 'reorder-up' | 'reorder-down' | 'confirm-order';

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

  if (context.hand === null) {
    const opens = matchesAnyKey(['edit', 'place'], context.key);
    if (!context.cellTarget || !opens) return 'ignore';

    return view === 'strips' ? 'open-picker' : 'focus-first';
  }

  const { hand, lessonIds } = context;
  if (hand.kind !== 'lesson') return 'ignore';

  const canReorder = view === 'pair' && !context.copyMode && lessonIds.includes(hand.lessonId);
  if (!canReorder) return 'ignore';

  if (matchesKey('previous', context.key)) return 'reorder-up';

  if (matchesKey('next', context.key)) return 'reorder-down';

  if (matchesKey('place', context.key)) return 'confirm-order';

  return 'ignore';
}

type PickerState = 'closed' | 'selecting' | 'suspended-for-editor';
export function pickerState(open: boolean, editing: boolean): PickerState {
  if (!open) return 'closed';

  return editing ? 'suspended-for-editor' : 'selecting';
}
