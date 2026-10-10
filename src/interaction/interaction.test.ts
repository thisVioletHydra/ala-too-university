import type { Lesson } from '#schedule/types.ts';

import { describe, expect, it } from 'vitest';
import { resolveCursorState, ownsAnimation } from './cursor.state.ts';
import { decideDrop } from './drop.policy.ts';
import { navigationPermissions } from './input.policy.ts';
import { pickerReturnAfter, pickerReturnLesson } from './picker.return.ts';
import { sidebarDestination } from './sidebar.navigation.ts';

const original: Lesson = {
  id: 'original',
  sectionId: 'section',
  teacherId: 'teacher',
  roomId: 'room',
  day: 'MON',
  timeSlotId: 'morning',
};
const copy: Lesson = { ...original, id: 'copy', day: 'TUE' };

describe('приоритеты переноса', () => {
  it('возврат в список удаляет занятие даже при включённом копировании', () => {
    expect(decideDrop({
      hand: { kind: 'lesson', lessonId: original.id },
      target: { kind: 'unassign' },
      lessons: [original],
      copyMode: true,
    })).toEqual({ kind: 'remove', lessonId: original.id });
  });

  it('возврат на исходное место отменяет перенос, а копирование переключает занятие', () => {
    const input = {
      hand: { kind: 'lesson', lessonId: original.id } as const,
      target: { kind: 'slot', day: original.day, timeSlotId: original.timeSlotId } as const,
      lessons: [original],
    };
    expect(decideDrop({ ...input, copyMode: false })).toEqual({ kind: 'cancel' });
    expect(decideDrop({ ...input, copyMode: true })).toEqual({ kind: 'remove', lessonId: original.id });
  });

  it('повторное размещение удаляет копию в цели, сохраняя исходное занятие', () => {
    expect(decideDrop({
      hand: { kind: 'section', sectionId: original.sectionId, originLessonId: original.id },
      target: { kind: 'slot', day: copy.day, timeSlotId: copy.timeSlotId },
      lessons: [original, copy],
      copyMode: true,
    })).toEqual({ kind: 'remove', lessonId: copy.id });
  });

  it('отсутствующее исходное занятие не превращается в назначение секции', () => {
    expect(decideDrop({
      hand: { kind: 'lesson', lessonId: 'missing' },
      target: { kind: 'slot', day: 'MON', timeSlotId: 'morning' },
      lessons: [],
      copyMode: false,
    })).toEqual({ kind: 'missing-source' });
  });
});

it('редактор приостанавливает карточку, а новая карточка заменяет посадку', () => {
  const context = { carrying: true, input: 'keyboard' as const, landing: { kind: 'tray' } as const, token: 2 };
  expect(resolveCursorState({ ...context, editing: true })).toEqual({ phase: 'paused' });
  expect(resolveCursorState({ ...context, editing: false })).toEqual({ phase: 'holding', input: 'keyboard' });
  expect(ownsAnimation({ phase: 'placing', target: { kind: 'slot', day: 'MON', timeSlotId: 'morning' }, token: 2 }, 1)).toBe(false);
  expect(ownsAnimation({ phase: 'returning', token: 2 }, 2)).toBe(true);
  expect(ownsAnimation({ phase: 'holding', input: 'keyboard' }, 2)).toBe(false);
});

it('посадка запрещает восстановление фокуса, но не обычную навигацию', () => {
  expect(navigationPermissions({
    composing: false,
    shiftPressed: false,
    sidebarHidden: false,
    carrying: false,
    dragging: false,
    editing: false,
    landing: true,
    repeated: false,
  })).toEqual({ sidebar: true, recoverFocus: false });
});

it('отмена возвращает только к существующему занятию, явное действие сбрасывает возврат', () => {
  const eligible = pickerReturnAfter({ kind: 'grab', lessonId: original.id });
  expect(pickerReturnLesson(eligible, [original.id])).toBe(original.id);
  expect(pickerReturnLesson(eligible, [])).toBeNull();
  expect(pickerReturnLesson(pickerReturnAfter({ kind: 'action' }), [original.id])).toBeNull();
});

it('из первого предупреждения навигация возвращается к последней карточке или поиску', () => {
  const input = { target: { kind: 'issue', index: 0 } as const, key: 'ArrowUp', selectedStatus: 0, statusCount: 3, issueCount: 2 };
  expect(sidebarDestination({ ...input, cardCount: 3 })).toEqual({ kind: 'card', index: 2 });
  expect(sidebarDestination({ ...input, cardCount: 0 })).toEqual({ kind: 'search' });
});
