/** Имя-заглушка вместо преподавателя, пока секции его не назначили. */
export const TEACHER_PLACEHOLDER = 'Нужен преподаватель';

export function needsTeacher(teacherName: string): boolean {
  return teacherName === TEACHER_PLACEHOLDER;
}
