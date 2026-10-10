import type { MouseEvent } from 'react';
import type { Option } from './select.tsx';

import { dataAttribute } from '#ui/data-attribute.ts';

import styles from './select.module.css';

type Props = {
  id: string;
  option: Option;
  selected: boolean;
  active: boolean;
  onHover: () => void;
  onSelect: (value: string) => void;
};

export function SelectOption({ id, option, selected, active, onHover, onSelect }: Props) {
  function handleClick(event: MouseEvent<HTMLDivElement>): void {
    event.preventDefault();
    event.stopPropagation();
    if (!option.disabled) onSelect(option.value);
  }

  function handlePointerMove(): void {
    if (!option.disabled) onHover();
  }

  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      aria-disabled={option.disabled || undefined}
      data-active={dataAttribute(active)}
      className={styles.option}
      onPointerDown={(event) => event.preventDefault()}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    >
      <span>{option.label}{option.detail && <small>{option.detail}</small>}</span>
      <span aria-hidden="true">{selected && '✓'}</span>
    </div>
  );
}
