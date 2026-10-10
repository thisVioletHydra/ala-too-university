export type CardInput = 'pointer' | 'keyboard';

function setFlag(name: 'drag' | 'hand' | 'cardInput', value: string | null): void {
  if (value === null) delete document.body.dataset[name];
  else document.body.dataset[name] = value;
}

/** Флаги на body: по ним CSS отличает перенос мышью, карточку в руке и способ ввода. */
export function setDragging(active: boolean): void {
  setFlag('drag', active ? 'yes' : null);
}

export function setHandActive(active: boolean): void {
  setFlag('hand', active ? 'yes' : null);
}

export function setCardInput(input: CardInput): void {
  setFlag('cardInput', input);
}
