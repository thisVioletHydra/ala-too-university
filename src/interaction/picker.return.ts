export type PickerReturn =
  | { kind: 'none' }
  | { kind: 'eligible'; lessonId: string };

type PickerReturnEvent =
  | { kind: 'grab'; lessonId: string }
  | { kind: 'action' }
  | { kind: 'release' };

export function pickerReturnAfter(event: PickerReturnEvent): PickerReturn {
  if (event.kind === 'grab') return { kind: 'eligible', lessonId: event.lessonId };

  return { kind: 'none' };
}

export function pickerReturnLesson(state: PickerReturn, lessonIds: string[]): string | null {
  if (state.kind === 'none') return null;

  return lessonIds.includes(state.lessonId) ? state.lessonId : null;
}
