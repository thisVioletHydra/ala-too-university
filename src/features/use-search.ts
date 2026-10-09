import type { Lesson, Section } from '#schedule/types.ts';

import { sectionProgress } from '#schedule/section-progress.ts';
import { useMemo, useState } from 'react';

export type ListMode = 'all' | 'not-done' | 'no-teacher';

export function useSearch(sections: Section[], lessons: Lesson[], courseName: (section: Section) => string) {
  const [query, setQuery] = useState('');
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
      all: matched.length,
      'not-done': matched.filter((section) => sectionProgress(section, lessons).state !== 'done').length,
      'no-teacher': matched.filter((section) => section.teacherId === null).length,
    };
  }, [matched, lessons]);

  return {
    query,
    setQuery,
    teacherId,
    setTeacherId,
    roomId,
    setRoomId,
    counts,
    visible: matched,
  };
}
