export function keyboardSlot(index: number, key: string, count: number): number {
  if (count <= 0) return 0;

  const current = Math.min(Math.max(index, 0), count - 1);
  if (key === 'ArrowDown') return Math.min(current + 1, count - 1);

  if (key === 'ArrowUp') return Math.max(current - 1, 0);

  return current;
}
