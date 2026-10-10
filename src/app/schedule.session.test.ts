import { afterEach, expect, it } from 'vitest';
import { parseSchedule } from '#data/schedule.parser.ts';
import { useSchedule } from './schedule.store.ts';
import { applyDataset } from './schedule.session.ts';

import rawSchedule from '#data/schedule-mock-data.json';

const catalog = parseSchedule(rawSchedule);
const previousState = useSchedule.getState();
afterEach(() => useSchedule.setState(previousState));

it('восстанавливает занятия и историю одним обновлением хранилища', () => {
  const saved = { dataset: 'mock', lessons: catalog.lessons.slice(0, 1), past: [catalog.lessons], future: [[]] } as const;
  let updates = 0;
  const unsubscribe = useSchedule.subscribe(() => { updates += 1; });
  try {
    applyDataset(catalog, 'mock', { ...saved, past: [...saved.past], future: [[]] });
    expect(updates).toBe(1);
    expect(useSchedule.getState()).toMatchObject({ catalog, dataset: 'mock', lessons: saved.lessons, past: saved.past, future: saved.future });
  } finally {
    unsubscribe();
  }
});

it('не переносит сохранённые занятия другого набора данных', () => {
  applyDataset(catalog, 'mock', { dataset: 'bulk', lessons: [], past: [[]], future: [[]] });
  expect(useSchedule.getState()).toMatchObject({ lessons: catalog.lessons, past: [], future: [] });
});

it('при переключении набора сбрасывает историю и создаёт расширенный каталог', () => {
  useSchedule.setState({ past: [catalog.lessons], future: [catalog.lessons] });
  const expanded = applyDataset(catalog, 'bulk');
  expect(expanded.sections.length).toBeGreaterThan(catalog.sections.length);
  expect(useSchedule.getState()).toMatchObject({ catalog: expanded, dataset: 'bulk', lessons: expanded.lessons, past: [], future: [] });
});
