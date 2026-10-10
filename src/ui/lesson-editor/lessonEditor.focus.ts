import type { EditorRequest } from '#interaction/types.ts';
import type { RefObject } from 'react';

import { matchesKey } from '#accessible/keyboard.bindings.ts';
import { useSchedule } from '#app/schedule.store.ts';
import { useEffect } from 'react';

/**
 * Ловушка Tab внутри диалога и возврат фокуса туда, откуда его открыли:
 * в пикер, в исходную клетку или на прежний элемент.
 */
export function useEditorFocus(dialog: RefObject<HTMLDivElement | null>, request: EditorRequest): void {
  useEffect(() => {
    const previous = document.activeElement;
    const source = request.mode === 'edit'
      ? useSchedule.getState().lessons.find((lesson) => lesson.id === request.lessonId)
      : null;
    const slot = previous instanceof Element ? previous.closest<HTMLElement>('[data-slot]') : null;
    const fallback = slot ?? (source
      ? document.querySelector<HTMLElement>(`[data-slot="${CSS.escape(`${source.day}|${source.timeSlotId}`)}"]`)
      : null);
    const root = dialog.current;
    const controls = () => Array.from(root?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]') ?? []);
    const focusFrame = window.requestAnimationFrame(() => {
      (root?.querySelector<HTMLElement>('[role="combobox"]') ?? controls()[0])?.focus({ preventScroll: true });
    });
    function trap(event: KeyboardEvent): void {
      if (matchesKey('switchArea', event.key) === null || matchesKey('switchArea', event.key) === undefined) return;

      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    root?.addEventListener('keydown', trap);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      root?.removeEventListener('keydown', trap);
      window.requestAnimationFrame(() => {
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

        const picker = document.querySelector<HTMLDialogElement>('dialog[data-slot-picker][open]');
        if (picker) {
          if (picker.contains(document.activeElement) === false) picker.querySelector<HTMLElement>('[data-lesson-id], [data-close-picker]')?.focus();

          return;
        }

        if (previous instanceof HTMLElement && previous.isConnected && !previous.closest('dialog:not([open])')) previous.focus();
        else if (fallback?.isConnected) fallback.focus();
      });
    };
  }, []);
}
