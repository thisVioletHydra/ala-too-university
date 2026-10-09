import type { Lesson, Section } from '#schedule/types.ts';
import type { ListMode } from '#schedule/section-selection.ts';
import { selectSections } from '#schedule/section-selection.ts';
import { useMemo, useState } from 'react';

export type { ListMode } from '#schedule/section-selection.ts';

export function useSearch(sections: Section[], lessons: Lesson[], courseName: (section: Section) => string, remembered: Record<string, string>) {
  const [groupBy, setGroupBy] = useState<'course' | 'teacher'>('course');
  const [sectionTeacherId, setSectionTeacherId] = useState('');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<ListMode>('not-done');
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  const matched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sections;
    function matchesQuery(section: Section): boolean {
      const name = courseName(section).toLowerCase();
      return section.code.toLowerCase().includes(needle) || name.includes(needle);
    }
    return sections.filter(matchesQuery);
  }, [sections, query, courseName]);

  const selection = selectSections({ sections: matched, lessons, remembered, mode, groupBy, teacherId: sectionTeacherId });
  return {
    groupBy, setGroupBy, sectionTeacherId, setSectionTeacherId,
    query, setQuery, teacherId, setTeacherId, roomId, setRoomId,
    counts: selection.counts, mode, setMode, visible: selection.visible,
  };
}
