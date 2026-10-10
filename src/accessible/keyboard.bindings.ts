export type InputMethod = 'pointer' | 'keyboard';
type Platform = 'mac' | 'windows' | 'other';
export type KeyStroke = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

export const keyboard = {
  navigation: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
  previous: ['ArrowUp'],
  next: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  first: ['Home'],
  last: ['End'],
  undo: ['z'],
  redo: ['y'],
  focusSearch: ['k'],
  place: [' ', 'Spacebar'],
  edit: ['Enter'],
  remove: ['Delete', 'Backspace'],
  cancel: ['Escape'],
  switchArea: ['Tab'],
  copyMode: ['Shift'],
} as const;

type KeyAction = keyof typeof keyboard;

export function matchesKey(action: KeyAction, key: string): boolean {
  return keyboard[action].some((candidate) => candidate === key);
}

export function isInteractionKey(key: string): boolean {
  return matchesAnyKey(['navigation', 'place', 'edit', 'remove', 'cancel', 'switchArea', 'copyMode'], key);
}

export function matchesAnyKey(actions: readonly KeyAction[], key: string): boolean {
  return actions.some((action) => matchesKey(action, key));
}

export function hasCommandModifier(stroke: KeyStroke): boolean {
  return stroke.metaKey || stroke.ctrlKey || stroke.altKey;
}

export function detectPlatform(platform: string): Platform {
  if (/Mac|iPhone|iPad/i.test(platform)) return 'mac';

  return /Win/i.test(platform) ? 'windows' : 'other';
}

const commandModifier = { mac: 'metaKey', windows: 'ctrlKey', other: 'ctrlKey' } as const;

type GlobalCommand = 'undo' | 'redo' | 'focusSearch' | 'close';

export function globalCommand(stroke: KeyStroke, platform: Platform): GlobalCommand | null {
  const primary = stroke[commandModifier[platform]];
  if (stroke.altKey) return null;

  if (primary === false) return matchesKey('cancel', stroke.key) ? 'close' : null;

  const key = stroke.key.toLowerCase();
  if (matchesKey('undo', key)) return stroke.shiftKey ? 'redo' : 'undo';

  if (matchesKey('redo', key) && platform === 'windows') return 'redo';

  return matchesKey('focusSearch', key) ? 'focusSearch' : null;
}

type HintContext = 'settings' | 'picker' | 'editor' | 'holding' | 'navigation';
export const keyboardHints: Record<HintContext, ReadonlyArray<readonly [string, string]>> = {
  settings: [['Tab', 'следующая настройка'], ['Пробел', 'переключить'], ['Esc', 'закрыть']],
  picker: [['↑ ↓', 'выбрать занятие'], ['Enter', 'править'], ['Пробел', 'взять'], ['Esc', 'вернуться в сетку']],
  editor: [['↑ ↓ ← →', 'поля / кнопки'], ['Enter', 'открыть / подтвердить'], ['Tab', 'следующее поле'], ['Esc', 'закрыть']],
  holding: [['↑↓←→', 'навигация'], ['Пробел', 'поставить'], ['Shift', 'режимы'], ['Enter', 'править'], ['Del / Backspace', 'удалить'], ['Tab', 'область'], ['Esc', 'отмена']],
  navigation: [['↑↓←→', 'навигация'], ['Пробел', 'взять'], ['Enter', 'открыть'], ['Tab', 'дальше']],
};
