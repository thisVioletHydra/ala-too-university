/** Селекторы клетки: держим их в одном месте, чтобы не растаскивать строки по файлам. */
const SLOT_SELECTOR = '[data-slot]';

export const LESSON_SELECTOR = '[data-lesson-id]';

export const PICKER_CLOSE_SELECTOR = '[data-close-picker]';

export function slotOf(root: HTMLElement | null): HTMLElement | null {
  return root?.closest<HTMLElement>(SLOT_SELECTOR) ?? null;
}

export function lessonNode(root: HTMLElement | null, lessonId: string): HTMLElement | null {
  return root?.querySelector<HTMLElement>(`[data-lesson-id="${CSS.escape(lessonId)}"]`) ?? null;
}
