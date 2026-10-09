import type { ScheduleCatalog, Section } from '#schedule/types.ts';

type Course = ScheduleCatalog['courses'][number];
type Teacher = ScheduleCatalog['teachers'][number];

const BULK_ID_PREFIX = 'SEC_BULK_';
const MAX_STUDENTS = 36;
const MIN_STUDENTS = 14;
const STUDENTS_SPREAD = 22;

export function withManySections(catalog: ScheduleCatalog, total: number): ScheduleCatalog {
  const { sections, courses, teachers } = catalog;
  if (sections.length >= total || courses.length === 0 || teachers.length === 0) return catalog;

  const extra: Section[] = [];
  for (let index = sections.length + 1; sections.length + extra.length < total; index += 1) {
    extra.push(buildBulkSection(index, courses, teachers));
  }

  return { ...catalog, sections: [...sections, ...extra] };
}

function buildBulkSection(index: number, courses: Course[], teachers: Teacher[]): Section {
  const course = courses[(index - 1) % courses.length];
  const teacher = teachers[(index - 1) % teachers.length];
  const nextTeacher = teachers[index % teachers.length];

  const hasAssignedTeacher = index % 17 !== 0;
  const isLab = index % 4 === 0;

  return {
    id: `${BULK_ID_PREFIX}${index}`,
    courseId: course.id,
    code: `${course.code}-${String(index).padStart(2, '0')}`,
    studentsCount: index % 11 === 0 ? MAX_STUDENTS : MIN_STUDENTS + (index % STUDENTS_SPREAD),
    requiredLessonsPerWeek: index % 3 === 0 ? 3 : 2,
    teacherId: hasAssignedTeacher ? teacher.id : null,
    allowedTeacherIds: hasAssignedTeacher ? [teacher.id] : [teacher.id, nextTeacher.id],
    preferredRoomType: isLab ? 'COMPUTER_LAB' : 'LECTURE',
  };
}