import { matchesKey } from '#accessible/keyboard.bindings.ts';

export type GridCursor = {
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
