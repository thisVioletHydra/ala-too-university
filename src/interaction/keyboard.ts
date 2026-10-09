export type InputMethod = 'pointer' | 'keyboard';
export type Platform = 'mac' | 'windows' | 'other';
export type KeyStroke = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

export const keys = {
  navigation: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
  place: [' ', 'Spacebar'],
  edit: ['Enter'],
  remove: ['Delete', 'Backspace'],
  cancel: ['Escape'],
  switchArea: ['Tab'],
  copyMode: ['Shift'],
} as const;

export type KeyAction = keyof typeof keys;

export function matchesKey(action: KeyAction, key: string): boolean {
  return keys[action].some((candidate) => candidate === key);
}

export function isInteractionKey(key: string): boolean {
  return Object.keys(keys).some((action) => matchesKey(action as KeyAction, key));
}

export function hasCommandModifier(stroke: KeyStroke): boolean {
  return stroke.metaKey || stroke.ctrlKey || stroke.altKey;
}

export function detectPlatform(platform: string): Platform {
  if (/Mac|iPhone|iPad/i.test(platform)) return 'mac';

  return /Win/i.test(platform) ? 'windows' : 'other';
}

export type GlobalCommand = 'undo' | 'redo' | 'focusSearch' | 'close';

export function globalCommand(stroke: KeyStroke, platform: Platform): GlobalCommand | null {
  const primary = platform === 'mac' ? stroke.metaKey : stroke.ctrlKey;
  if (stroke.altKey) return null;

  if (primary === false) return matchesKey('cancel', stroke.key) ? 'close' : null;

  const key = stroke.key.toLowerCase();
  if (key === 'z') return stroke.shiftKey ? 'redo' : 'undo';

  if (key === 'y' && platform === 'windows') return 'redo';

  return key === 'k' ? 'focusSearch' : null;
}

export type HintContext = 'settings' | 'picker' | 'editor' | 'holding' | 'navigation';
export const keyboardHints: Record<HintContext, ReadonlyArray<readonly [string, string]>> = {
  settings: [['Tab', 'следующая настройка'], ['Пробел', 'переключить'], ['Esc', 'закрыть']],
  picker: [['↑ ↓', 'выбрать занятие'], ['Enter', 'править'], ['Пробел', 'взять'], ['Esc', 'вернуться в сетку']],
  editor: [['↑ ↓ ← →', 'поля / кнопки'], ['Enter', 'открыть / подтвердить'], ['Tab', 'следующее поле'], ['Esc', 'закрыть']],
  holding: [['↑↓←→', 'навигация'], ['Пробел', 'поставить'], ['Shift', 'режимы'], ['Enter', 'править'], ['Del / Backspace', 'удалить'], ['Tab', 'область'], ['Esc', 'отмена']],
  navigation: [['↑↓←→', 'навигация'], ['Пробел', 'взять'], ['Enter', 'открыть'], ['Tab', 'дальше']],
};
