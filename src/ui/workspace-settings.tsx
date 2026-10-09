import { keyboardHints } from '#interaction/keyboard.ts';
import type { Dataset } from '#app/schedule.store.ts';

import { useBoard } from '#app/providers.tsx';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function WorkspaceSettings(props: { dataset: Dataset; onDataset: (dataset: Dataset) => void }) {
  const board = useBoard();
  const [hints, setHints] = useState(() => localStorage.getItem('schedule-keyboard-hints') !== 'off');
  const [keyboard, setKeyboard] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    function syncPicker(): void {
      setPickerOpen(Boolean(document.querySelector('dialog[data-slot-picker][open]')));
    }
    document.addEventListener('toggle', syncPicker, true);
    document.addEventListener('focusin', syncPicker);
    return () => {
      document.removeEventListener('toggle', syncPicker, true);
      document.removeEventListener('focusin', syncPicker);
    };
  }, []);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    function onKey(event: KeyboardEvent): void {
      if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape'].includes(event.key)) {
        clearTimeout(hideTimer);
        setKeyboard(true);
      }
    }
    function onPointer(): void {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setKeyboard(false), 800);
    }
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('pointermove', onPointer);
    return () => {
      clearTimeout(hideTimer);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  const context = settingsOpen ? 'settings' : pickerOpen ? 'picker' : board.editor ? 'editor' : board.hold.hand ? 'holding' : 'navigation';
  const shortcuts = keyboardHints[context];
  const hintsSlot = document.getElementById('keyboard-hints-slot');

  return <>
    <button className="settings-trigger" type="button" popoverTarget="workspace-settings" aria-label="Настройки" title="Настройки">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="m9 3-.7 2.4-2 .9L4 5.8 2 9l1.8 1.7v2.6L2 15l2 3.2 2.3-.5 2 .9L9 21h6l.7-2.4 2-.9 2.3.5 2-3.2-1.8-1.7v-2.6L22 9l-2-3.2-2.3.5-2-.9L15 3Z" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3.3" />
      </svg>
    </button>
    <div id="workspace-settings" className="settings-popover" popover="auto" aria-labelledby="settings-title" onToggle={(event) => setSettingsOpen(event.newState === 'open')}>
      <header><h2 id="settings-title">Настройки</h2><button type="button" popoverTarget="workspace-settings" popoverTargetAction="hide" aria-label="Закрыть настройки">×</button></header>
      <label className="settings-row"><span><strong>Клавиатурные подсказки</strong><small>Появляются в шапке при работе с клавиатурой</small></span><input type="checkbox" role="switch" checked={hints} onChange={(event) => { setHints(event.target.checked); localStorage.setItem('schedule-keyboard-hints', event.target.checked ? 'on' : 'off'); }} /></label>
      <label className="settings-row"><span><strong>500 секций</strong><small>Выключено — базовый набор моков. Переключение сбрасывает расписание.</small></span><input type="checkbox" role="switch" checked={props.dataset === 'bulk'} onChange={(event) => { board.setEditor(null); board.setHold({ hand: null, aim: '', overKey: null, overList: false }); props.onDataset(event.target.checked ? 'bulk' : 'mock'); }} /></label>
    </div>
    {hints && keyboard && hintsSlot ? createPortal(<div className="keyboard-hints" aria-label="Клавиатурные подсказки">{shortcuts.map(([key, text]) => <span key={key}><kbd>{key}</kbd>{text}</span>)}</div>, hintsSlot) : null}
  </>;
}
