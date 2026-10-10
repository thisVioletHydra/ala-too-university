import { matchesKey } from '#accessible/keyboard.bindings.ts';

type GridCursor = {
  day: number
  slot: number
};

export function keyboardGrid(cursor: GridCursor, key: string, dayCount: number, slotCount: number): GridCursor {
  if (dayCount <= 0 || slotCount <= 0) return { day: 0, slot: 0 };

  const day = Math.min(Math.max(cursor.day, 0), dayCount - 1);
  const slot = Math.min(Math.max(cursor.slot, 0), slotCount - 1);
  if (matchesKey('right', key)) return { day: Math.min(day + 1, dayCount - 1), slot };

  if (matchesKey('left', key)) return { day: Math.max(day - 1, 0), slot };

  if (matchesKey('next', key)) return { day, slot: Math.min(slot + 1, slotCount - 1) };

  if (matchesKey('previous', key)) return { day, slot: Math.max(slot - 1, 0) };

  return { day, slot };
}

export function keyboardSlot(index: number, key: string, count: number): number {
  if (count <= 0) return 0;

  const current = Math.min(Math.max(index, 0), count - 1);
  if (matchesKey('next', key)) return Math.min(current + 1, count - 1);

  if (matchesKey('previous', key)) return Math.max(current - 1, 0);

  return current;
}
