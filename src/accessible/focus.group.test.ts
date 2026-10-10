import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextEnabledIndex, trapTab } from './focus.group.ts';
import { isPointerIntent } from './input.method.ts';
import { acceptsPointer } from './input.pointer.ts';

function control(): HTMLElement {
  return { focus: vi.fn() } as unknown as HTMLElement;
}

function stroke(key: string, shiftKey = false): KeyboardEvent {
  return { key, shiftKey, defaultPrevented: false, preventDefault: vi.fn() } as unknown as KeyboardEvent;
}

afterEach(() => vi.unstubAllGlobals());

describe('циклическая навигация', () => {
  it('обходит недоступные элементы и замыкает группу', () => {
    expect(nextEnabledIndex({ current: 2, count: 3, direction: 1, enabled: (index) => index !== 0 })).toBe(1);
    expect(nextEnabledIndex({ current: 0, count: 3, direction: -1 })).toBe(2);
  });

  it('выбирает крайний элемент при входе извне и обрабатывает пустую группу', () => {
    expect(nextEnabledIndex({ current: -1, count: 3, direction: 1 })).toBe(0);
    expect(nextEnabledIndex({ current: -1, count: 3, direction: -1 })).toBe(2);
    expect(nextEnabledIndex({ current: 0, count: 0, direction: 1 })).toBe(-1);
    expect(nextEnabledIndex({ current: 0, count: 3, direction: 1, enabled: () => false })).toBe(-1);
  });
});

describe('фокус диалога', () => {
  it('не перехватывает Enter и стрелки на последнем элементе', () => {
    const items = [control(), control()];
    vi.stubGlobal('document', { activeElement: items[1] });
    for (const key of ['Enter', 'ArrowDown', 'Escape']) {
      const event = stroke(key);
      trapTab(event, items);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(items[0].focus).not.toHaveBeenCalled();
    }
  });

  it('замыкает Tab и Shift+Tab на границах', () => {
    const items = [control(), control()];
    const focusDocument = { activeElement: items[1] };
    vi.stubGlobal('document', focusDocument);
    const forward = stroke('Tab');
    trapTab(forward, items);
    expect(forward.preventDefault).toHaveBeenCalledOnce();
    expect(items[0].focus).toHaveBeenCalledOnce();
    focusDocument.activeElement = items[0];
    const backward = stroke('Tab', true);
    trapTab(backward, items);
    expect(items[1].focus).toHaveBeenCalledOnce();
  });

  it('оставляет обычный Tab внутри группы браузеру', () => {
    const items = [control(), control(), control()];
    vi.stubGlobal('document', { activeElement: items[1] });
    const event = stroke('Tab');
    trapTab(event, items);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

it('малое движение мыши не отбирает управление у клавиатуры', () => {
  const sample = { primary: true, eventType: 'pointermove', x: 10, y: 10, movementX: 1, movementY: 1 };
  expect(acceptsPointer('keyboard', sample)).toBe(false);
  expect(acceptsPointer('pointer', sample)).toBe(true);
  expect(isPointerIntent({ isPrimary: true, type: 'pointerdown', movementX: 0, movementY: 0 })).toBe(true);
  expect(acceptsPointer('keyboard', { ...sample, movementX: 10 })).toBe(true);
});
