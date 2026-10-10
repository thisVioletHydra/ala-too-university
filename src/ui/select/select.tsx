import { SelectOption } from './select.option.tsx';
import { matchesAnyKey, matchesKey } from '#accessible/keyboard.bindings.ts';
import { useEffect, useId, useRef, useState } from 'react';

import styles from '#ui/select/select.module.css';

export type Option = { value: string; label: string; disabled?: boolean; detail?: string };

/** Печатный символ без служебных модификаторов — годится для поиска по первым буквам. */
function isTypeahead(event: { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean }): boolean {
  return event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey;
}

export function Select(props: { label: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const search = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = Math.max(0, props.options.findIndex((option) => option.value === props.value));

  useEffect(() => {
    if (!open) return;

    function outside(event: PointerEvent): void {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener('pointerdown', outside);

    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const option = root.current?.querySelector<HTMLElement>('[data-active="yes"]');
    const menu = option?.parentElement;
    if (!option || !menu) return;

    if (option.offsetTop < menu.scrollTop) menu.scrollTop = option.offsetTop;

    if (option.offsetTop + option.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = option.offsetTop + option.offsetHeight - menu.clientHeight;
  }, [active, open]);

  function move(direction: number): void {
    let next = active;
    for (let count = 0; count < props.options.length; count++) {
      next = (next + direction + props.options.length) % props.options.length;
      if (!props.options[next]?.disabled) { setActive(next);
        return;
      }
    }
  }

  function selectOption(value: string): void {
    props.onChange(value);
    setOpen(false);
  }

  function toggleMenu(): void {
    setActive(selected);
    setOpen(!open);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>): void {
    if (matchesKey('switchArea', event.key)) { setOpen(false);

      return;
    }

    if (matchesKey('cancel', event.key) && open) { event.preventDefault();
      event.stopPropagation();
      setOpen(false);

      return;
    }

    if (matchesAnyKey(['next', 'previous', 'first', 'last', 'edit', 'place'], event.key)) {
      event.preventDefault();
      event.stopPropagation();
      if (!open) { setActive(selected);
        setOpen(true);

        return;
      }

      if (matchesKey('next', event.key) || matchesKey('previous', event.key)) { move(matchesKey('next', event.key) ? 1 : -1);

        return;
      }

      if (matchesKey('first', event.key) || matchesKey('last', event.key)) {
        const indices = props.options.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);
        setActive(matchesKey('first', event.key) ? indices[0] ?? 0 : indices.at(-1) ?? 0);

        return;
      }

      const option = props.options[active];
      if (option && !option.disabled) props.onChange(option.value);

      setOpen(false);

      return;
    }

    if (isTypeahead(event)) {
      event.preventDefault();
      event.stopPropagation();
      search.current.text = Date.now() - search.current.time < 700 ? search.current.text + event.key : event.key;
      search.current.time = Date.now();
      const found = props.options.findIndex((option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(search.current.text.toLocaleLowerCase()));
      if (found >= 0) { setActive(found);
        setOpen(true);
      }
    }
  }

  return <div className={styles.field} ref={root} onBlur={(event) => { if (event.currentTarget.contains(event.relatedTarget) === false) setOpen(false); }}>
    <button type="button" role="combobox" className={styles.trigger} aria-label={props.label} title={`${props.label}: ${props.options[selected]?.label}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-activedescendant={open ? `${id}-${active}` : undefined} data-filtered={props.value ? 'yes' : 'no'}
      onClick={toggleMenu}
      onKeyDown={handleKeyDown}>
      <span>{props.options[selected]?.label}</span>
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {open ? <div id={id} role="listbox" aria-label={props.label} className={styles.menu}>
      {props.options.map((option, index) => (
        <SelectOption
          key={option.value}
          id={`${id}-${index}`}
          option={option}
          selected={option.value === props.value}
          active={index === active}
          onHover={() => setActive(index)}
          onSelect={selectOption}
        />
      ))}
    </div> : null}
  </div>;
}
