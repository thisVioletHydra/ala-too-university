/** Короткий номер секции: из «CS101-01» при коде курса «CS101» получается «01». */
export function sectionNumber(courseCode: string, code: string): string {
  const prefix = `${courseCode}-`;
  if (courseCode.length > 0 && code.startsWith(prefix)) return code.slice(prefix.length);

  return code;
}
