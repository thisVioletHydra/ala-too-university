import type { ActiveDrag } from '#interaction/types.ts';
import type { Lesson, ScheduleCatalog } from '#schedule/types.ts';

import { TEACHER_PLACEHOLDER } from '#ui/teacher-label.ts';
import { LessonPreview } from '#ui/lesson-card/lesson-card.tsx';

export function heldCard(
  catalog: ScheduleCatalog,
  lessons: Lesson[],
  remembered: Record<string, string>,
  drag: ActiveDrag,
) {
  if (drag.kind === 'section') {
    const section = catalog.sections.find((item) => item.id === drag.sectionId);
    if (section === null || section === undefined) return null;

    const course = catalog.courses.find((item) => item.id === section.courseId);
    const teacherId = drag.teacherId ?? section.teacherId ?? remembered[section.id];
    const room = catalog.rooms.find((item) => item.id === drag.roomId);
    const teacher = catalog.teachers.find((item) => item.id === teacherId);

    return (
      <LessonPreview
        courseId={section.courseId}
        courseName={course?.name ?? section.code}
        courseCode={course?.code ?? section.code}
        code={section.code}
        teacherName={teacher?.shortName ?? 'Выбор преподавателя'}
        roomName={room?.name ?? 'Не выбрана'}
        roomType={room?.type ?? section.preferredRoomType}
        preferredRoomType={section.preferredRoomType}
      />
    );
  }

  const lesson = lessons.find((item) => item.id === drag.lessonId);
  const section = catalog.sections.find((item) => item.id === lesson?.sectionId);
  const teacher = catalog.teachers.find((item) => item.id === lesson?.teacherId);
  const room = catalog.rooms.find((item) => item.id === lesson?.roomId);
  const course = catalog.courses.find((item) => item.id === section?.courseId);
  if (!lesson || !section || !room) return null;

  return (
    <LessonPreview
      courseId={section.courseId}
      courseCode={course?.code ?? section.code}
      courseName={course?.name ?? section.code}
      code={section.code}
      teacherName={teacher?.shortName ?? TEACHER_PLACEHOLDER}
      roomName={room.name}
      roomType={room.type}
      preferredRoomType={section.preferredRoomType}
    />
  );
}
