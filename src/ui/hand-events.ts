/** Событие «перенос отменён»: его слушает пикер занятий, чтобы вернуть выбор. */
const CANCEL_HAND_EVENT = 'schedule:cancel-hand';

export function requestCancelHand(): void {
  window.dispatchEvent(new Event(CANCEL_HAND_EVENT));
}

export function subscribeCancelHand(handler: () => void): () => void {
  window.addEventListener(CANCEL_HAND_EVENT, handler);

  return () => window.removeEventListener(CANCEL_HAND_EVENT, handler);
}
