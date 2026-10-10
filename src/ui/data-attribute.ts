/** Значение data-атрибута-флага: у React это строка, а не boolean. */
export function dataAttribute(value: boolean | undefined): string {
  return value ? 'yes' : 'no';
}
