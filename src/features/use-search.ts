import { sectionTeacher } from '#schedule/section-teacher.ts';
import type { Lesson, Section } from '#schedule/types.ts';

import { scheduleProgress, sectionProgress } from '#schedule/section-progress.ts';
import { useMemo, useState } from 'react';

export type ListMode = 'all' | 'not-done' | 'done' | 'no-teacher' | 'excess';

function needsTeacher(section: Section, lessons: Lesson[], remembered: Record<string, string>): boolean {
  return !sectionTeacher(section, lessons, remembered);
}

export function useSearch(sections: Section[], lessons: Lesson[], courseName: (section: Section) => string, remembered: Record<string, string>) {
  const [groupBy, setGroupBy] = useState<'course' | 'teacher'>('course');
  const [sectionTeacherId, setSectionTeacherId] = useState('');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<ListMode>('not-done');
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  const matched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sections.filter((section) => {
      if (needle === null || needle === undefined) return true;

      const name = courseName(section).toLowerCase();

      return section.code.toLowerCase().includes(needle) || name.includes(needle);
    });
  }, [sections, lessons, query, courseName]);

  const counts: Record<ListMode, number> = useMemo(() => {
    return {
      ...scheduleProgress(matched, lessons).sections,
      excess: matched.filter((section) => sectionProgress(section, lessons).placed > section.requiredLessonsPerWeek).length,
      'no-teacher': matched.filter((section) => needsTeacher(section, lessons, remembered)).length,
    };
  }, [matched, lessons, remembered]);

  const courseOrder = new Map([...new Set(matched.map((section) => section.courseId))].map((id, index) => [id, index]));

  return {
    groupBy,
    setGroupBy,
    sectionTeacherId,
    setSectionTeacherId,
    query,
    setQuery,
    teacherId,
    setTeacherId,
    roomId,
    setRoomId,
    counts,
    mode,
    setMode,
    visible: matched.filter((section) => groupBy !== 'teacher' || !sectionTeacherId || sectionTeacher(section, lessons, remembered) === sectionTeacherId).filter((section) => mode === 'all' || (mode === 'excess'
      ? sectionProgress(section, lessons).placed > section.requiredLessonsPerWeek
      : mode === 'no-teacher'
      ? needsTeacher(section, lessons, remembered)
      : mode === 'done'
        ? sectionProgress(section, lessons).state === 'done'
        : sectionProgress(section, lessons).state !== 'done')).sort((a, b) => groupBy === 'teacher'
      ? (sectionTeacher(a, lessons, remembered) ?? '').localeCompare(sectionTeacher(b, lessons, remembered) ?? '') || (courseOrder.get(a.courseId) ?? 0) - (courseOrder.get(b.courseId) ?? 0)
      : (courseOrder.get(a.courseId) ?? 0) - (courseOrder.get(b.courseId) ?? 0)),
  };
}
