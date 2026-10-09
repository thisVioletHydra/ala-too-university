import type { Lesson, Section } from '#schedule/types.ts';

import { scheduleProgress, sectionProgress } from '#schedule/section-progress.ts';
import { useMemo, useState } from 'react';

export type ListMode = 'all' | 'not-done' | 'done' | 'no-teacher';

export function useSearch(sections: Section[], lessons: Lesson[], courseName: (section: Section) => string, remembered: Record<string, string>) {
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
      'no-teacher': matched.filter((section) => !section.teacherId && !remembered[section.id] && !lessons.some((lesson) => lesson.sectionId === section.id && lesson.teacherId)).length,
    };
  }, [matched, lessons, remembered]);

  const courseOrder = new Map([...new Set(matched.map((section) => section.courseId))].map((id, index) => [id, index]));

  return {
    query,
    setQuery,
    teacherId,
    setTeacherId,
    roomId,
    setRoomId,
    counts,
    mode,
    setMode,
    visible: matched.filter((section) => mode === 'all' || (mode === 'no-teacher' ? !section.teacherId && !remembered[section.id] && !lessons.some((lesson) => lesson.sectionId === section.id && lesson.teacherId) : mode === 'done' ? sectionProgress(section, lessons).state === 'done' : sectionProgress(section, lessons).state !== 'done')).sort((a, b) => (courseOrder.get(a.courseId) ?? 0) - (courseOrder.get(b.courseId) ?? 0)),
  };
}
