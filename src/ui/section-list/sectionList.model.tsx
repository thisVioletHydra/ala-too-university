import type { ReactNode } from 'react';
import type { Grouping } from '#features/section-groups.ts';
import type { ListMode } from '#features/use-search.ts';
import type { Teacher } from '#schedule/types.ts';

export type ModeTab = {
  id: ListMode
  label: string
};

export type SelectOption = {
  value: string
  label: string
};

const LIST_RETURN_AIM = 'list:return';

export const MODE_TABS: readonly ModeTab[] = [
  { id: 'not-done', label: 'Осталось' },
  { id: 'done', label: 'Готово' },
  { id: 'all', label: 'Все' },
];

export const MODE_TITLES: Record<ListMode, string> = {
  all: 'Все секции',
  'not-done': 'Осталось распределить',
  done: 'Готовые секции',
  'no-teacher': 'Нужен преподаватель',
  excess: 'Дополнительные занятия',
};

const EMPTY_TITLES: Partial<Record<ListMode, string>> = {
  'no-teacher': 'Все секции с преподавателем',
  done: 'Пока нет готовых секций',
};

const GROUP_BY_LABEL: Record<Grouping, string> = {
  course: 'Группировать по преподавателям',
  teacher: 'Группировать по дисциплинам',
};

const GROUP_BY_TITLE: Record<Grouping, string> = {
  course: 'По дисциплинам · переключить на преподавателей',
  teacher: 'По преподавателям · переключить на дисциплины',
};

const GROUP_BY_NEXT: Record<Grouping, Grouping> = {
  course: 'teacher',
  teacher: 'course',
};

export const GROUP_BY_ICONS: Record<Grouping, ReactNode> = {
  teacher: (
    <>
      <circle cx="10" cy="6" r="3" />
      <path d="M4 17v-2a6 6 0 0 1 12 0v2" />
    </>
  ),
  course: (
    <>
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <path d="M7 3v14M10 7h4M10 11h4" />
    </>
  ),
};

export function groupByLabel(groupBy: Grouping): string {
  return GROUP_BY_LABEL[groupBy];
}

export function groupByTitle(groupBy: Grouping): string {
  return GROUP_BY_TITLE[groupBy];
}

export function nextGroupBy(groupBy: Grouping): Grouping {
  return GROUP_BY_NEXT[groupBy];
}

export function emptyTitle(query: string, mode: ListMode): string {
  if (query) return 'Ничего не найдено';

  return EMPTY_TITLES[mode] ?? 'Все секции распределены';
}

export function emptyHint(query: string): string {
  return query ? 'Попробуйте другой запрос' : 'Выберите вкладку «Все», чтобы увидеть весь список';
}

export function listTabIndex(aim: string, empty: boolean): number {
  return empty || aim === LIST_RETURN_AIM ? 0 : -1;
}

export function listAimActive(aim: string, empty: boolean): boolean {
  return aim === LIST_RETURN_AIM || (empty && aim.startsWith('list:'));
}

export function teacherOptions(teachers: Teacher[]): SelectOption[] {
  return [
    { value: '', label: 'Все преподаватели' },
    ...teachers.map((teacher) => ({ value: teacher.id, label: teacher.shortName })),
  ];
}

export function dropHintText(handKind: string | null, ghostKind: string | null): string {
  const carryingSection = handKind === 'section' || ghostKind === 'section';

  return carryingSection ? 'Вернуть секцию · Отменить перенос' : 'Вернуть в нераспределённые';
}
