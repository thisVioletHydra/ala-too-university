/**
 * Попадание точки в прямоугольник. Адаптер отдаёт голые числа из
 * `getBoundingClientRect()`, решение остаётся здесь — без DOM и React.
 */
type Bounds = {
  left: number
  right: number
  top: number
  bottom: number
};

export function isInsideBounds(bounds: Bounds, x: number, y: number): boolean {
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

export function isOutsideBounds(bounds: Bounds, x: number, y: number): boolean {
  return x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom;
}
