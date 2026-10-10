import type { EditorRequest } from '#interaction/types.ts';
import type { RefObject } from 'react';

import { bindDialogFocus, restoreFocus } from '#accessible/focus.dialog.ts';
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
    if (root === null) return;

    return bindDialogFocus({
      root,
      initial: root.querySelector<HTMLElement>('[role="combobox"]'),
      restore: () => {
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

        const picker = document.querySelector<HTMLDialogElement>('dialog[data-slot-picker][open]');
        if (picker) {
          if (picker.contains(document.activeElement) === false) picker.querySelector<HTMLElement>('[data-lesson-id], [data-close-picker]')?.focus();

          return;
        }

        restoreFocus(previous, fallback);
      },
    });
  }, [dialog, request]);
}
