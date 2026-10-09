/** Русская форма множественного числа: `plural(2, 'занятие', 'занятия', 'занятий')`. */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const isFew = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
  if (mod10 === 1 && mod100 !== 11) return one;

  if (isFew) return few;

  return many;
}
