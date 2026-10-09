import { detectPlatform, globalCommand } from '#interaction/keyboard.ts';

type Hotkeys = {
  undo: () => void
  redo: () => void
  focusSearch: () => void
  close: () => void
};

export function bindHotkeys(handlers: Hotkeys): () => void {
  const platform = detectPlatform(navigator.platform);
  function onKeyDown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;

    const command = globalCommand(event, platform);
    if (command === null || command === undefined) return;

    if (command !== 'close') event.preventDefault();

    handlers[command]();
  }

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
