type Hotkeys = {
  undo: () => void
  redo: () => void
  focusSearch: () => void
  close: () => void
};

export function bindHotkeys(handlers: Hotkeys): () => void {
  function onKeyDown(event: KeyboardEvent): void {
    const meta = event.metaKey || event.ctrlKey;
    if (meta && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      handlers.undo();
      return;
    }

    if (meta && event.key.toLowerCase() === 'z' && event.shiftKey) {
      event.preventDefault();
      handlers.redo();
      return;
    }

    if (meta && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      handlers.focusSearch();
      return;
    }

    if (event.key === 'Escape') handlers.close();
  }

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
