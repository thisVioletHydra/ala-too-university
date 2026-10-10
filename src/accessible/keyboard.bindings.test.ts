import type { KeyStroke } from '#accessible/keyboard.bindings.ts';

import { detectPlatform, globalCommand } from '#accessible/keyboard.bindings.ts';
import { describe, expect, it } from 'vitest';

function stroke(patch: Partial<KeyStroke> = {}): KeyStroke {
  return { key: 'a', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...patch };
}

// Глобальные команды включаются только вместе с платформенным модификатором.
// Без него Escape закрывает, а «z» ничего не делает.
describe('globalCommand', () => {
  it('закрывает по Escape без модификаторов', () => {
    expect(globalCommand(stroke({ key: 'Escape' }), 'mac')).toBe('close');
    expect(globalCommand(stroke({ key: 'Escape' }), 'windows')).toBe('close');
  });

  it('не запускает undo и redo без модификатора', () => {
    expect(globalCommand(stroke({ key: 'z' }), 'mac')).toBeNull();
    expect(globalCommand(stroke({ key: 'z' }), 'windows')).toBeNull();
    expect(globalCommand(stroke({ key: 'y' }), 'windows')).toBeNull();
    expect(globalCommand(stroke({ key: 'k' }), 'mac')).toBeNull();
  });

  it('работает с платформенным модификатором', () => {
    expect(globalCommand(stroke({ key: 'z', metaKey: true }), 'mac')).toBe('undo');
    expect(globalCommand(stroke({ key: 'z', metaKey: true, shiftKey: true }), 'mac')).toBe('redo');
    expect(globalCommand(stroke({ key: 'z', ctrlKey: true }), 'windows')).toBe('undo');
    expect(globalCommand(stroke({ key: 'y', ctrlKey: true }), 'windows')).toBe('redo');
    expect(globalCommand(stroke({ key: 'k', ctrlKey: true }), 'windows')).toBe('focusSearch');
  });

  it('не берёт чужие модификаторы', () => {
    expect(globalCommand(stroke({ key: 'z', metaKey: true }), 'windows')).toBeNull();
    expect(globalCommand(stroke({ key: 'z', ctrlKey: true }), 'mac')).toBeNull();
  });

  it('alt отменяет любую команду', () => {
    expect(globalCommand(stroke({ key: 'z', ctrlKey: true, altKey: true }), 'windows')).toBeNull();
  });
});

describe('detectPlatform', () => {
  it('различает mac, windows и остальных', () => {
    expect(detectPlatform('MacIntel')).toBe('mac');
    expect(detectPlatform('Win32')).toBe('windows');
    expect(detectPlatform('Linux x86_64')).toBe('other');
  });
});
