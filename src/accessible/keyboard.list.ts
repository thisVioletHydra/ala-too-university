import { matchesKey } from '#accessible/keyboard.bindings.ts';

export function keyboardSlot(index: number, key: string, count: number): number {
  if (count <= 0) return 0;

  const current = Math.min(Math.max(index, 0), count - 1);
  if (matchesKey('next', key)) return Math.min(current + 1, count - 1);

  if (matchesKey('previous', key)) return Math.max(current - 1, 0);

  return current;
}
