export type PickerReturn =
  | { kind: 'none' }
  | { kind: 'eligible'; lessonId: string };

export type PickerReturnEvent =
  | { kind: 'grab'; lessonId: string }
  | { kind: 'action' }
  | { kind: 'release' };

export function pickerReturnAfter(_state: PickerReturn, event: PickerReturnEvent): PickerReturn {
  switch (event.kind) {
    case 'grab':
      return { kind: 'eligible', lessonId: event.lessonId };
    case 'action':
    case 'release':
      return { kind: 'none' };
  }
}

export function pickerReturnLesson(state: PickerReturn, lessonIds: string[]): string | null {
  if (state.kind === 'none') return null;
  return lessonIds.includes(state.lessonId) ? state.lessonId : null;
}
