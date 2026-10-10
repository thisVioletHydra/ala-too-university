import { afterEach, expect, it, vi } from 'vitest';
import { subscribeInputMethod } from './input.method.ts';

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();

  vi.unstubAllGlobals();
});

it('использует одну подписку на событие и снимает её после последнего потребителя', () => {
  const target = new EventTarget();
  const add = vi.spyOn(target, 'addEventListener');
  const remove = vi.spyOn(target, 'removeEventListener');
  vi.stubGlobal('window', target);
  const first = vi.fn();
  const second = vi.fn();
  const stopFirst = subscribeInputMethod(first);
  const stopSecond = subscribeInputMethod(second);
  cleanups.push(stopFirst, stopSecond);
  expect(add.mock.calls.map(([type]) => type)).toEqual(['keydown', 'pointerdown', 'pointermove']);

  const key = new Event('keydown');
  Object.defineProperties(key, { key: { value: 'ArrowDown' }, isComposing: { value: false } });
  target.dispatchEvent(key);
  expect(first).toHaveBeenCalledWith('keyboard');
  expect(second).toHaveBeenCalledWith('keyboard');

  stopFirst();
  expect(remove).not.toHaveBeenCalled();
  target.dispatchEvent(key);
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(2);
  stopSecond();
  expect(remove).toHaveBeenCalledTimes(3);
});
