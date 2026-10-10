import { describe, expect, it } from 'vitest';
import { scrollDistance } from './focus.scroll.ts';

describe('видимость клавиатурной цели', () => {
  const viewport = { start: 100, end: 400 };

  it('прокручивает вверх клетку, перекрытую закреплённой шапкой', () => {
    expect(scrollDistance({ start: 60, end: 160 }, viewport)).toBe(-40);
  });

  it('показывает нижнюю границу клетки при движении вниз', () => {
    expect(scrollDistance({ start: 350, end: 450 }, viewport)).toBe(50);
  });

  it('не двигает полностью видимую клетку', () => {
    expect(scrollDistance({ start: 120, end: 220 }, viewport)).toBe(0);
  });

  it('показывает начало клетки, которая больше доступной области', () => {
    expect(scrollDistance({ start: 200, end: 700 }, viewport)).toBe(100);
    expect(scrollDistance({ start: 100, end: 600 }, viewport)).toBe(0);
  });
});
