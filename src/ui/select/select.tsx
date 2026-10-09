import { useEffect, useId, useRef, useState } from 'react';

import styles from '#ui/select/select.module.css';

type Option = { value: string; label: string; disabled?: boolean; detail?: string };

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

  return <div className={styles.field} ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" role="combobox" className={styles.trigger} aria-label={props.label} title={`${props.label}: ${props.options[selected]?.label}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-activedescendant={open ? `${id}-${active}` : undefined} data-filtered={props.value ? 'yes' : 'no'}
      onClick={() => { setActive(selected);
        setOpen(!open);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Tab') { setOpen(false);

          return;
        }

        if (event.key === 'Escape' && open) { event.preventDefault();
          event.stopPropagation();
          setOpen(false);

          return;
        }

        if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          if (!open) { setActive(selected);
            setOpen(true);

            return;
          }

          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { move(event.key === 'ArrowDown' ? 1 : -1);

            return;
          }

          if (event.key === 'Home' || event.key === 'End') {
            const indices = props.options.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);
            setActive(event.key === 'Home' ? indices[0] ?? 0 : indices.at(-1) ?? 0);

            return;
          }

          const option = props.options[active];
          if (option && !option.disabled) props.onChange(option.value);

          setOpen(false);

          return;
        }

        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          event.stopPropagation();
          search.current.text = Date.now() - search.current.time < 700 ? search.current.text + event.key : event.key;
          search.current.time = Date.now();
          const found = props.options.findIndex((option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(search.current.text.toLocaleLowerCase()));
          if (found >= 0) { setActive(found);
            setOpen(true);
          }
        }
      }}>
      <span>{props.options[selected]?.label}</span>
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {open ? <div id={id} role="listbox" aria-label={props.label} className={styles.menu}>
      {props.options.map((option, index) => <div key={option.value} id={`${id}-${index}`} role="option" aria-selected={option.value === props.value} aria-disabled={option.disabled || undefined} data-active={index === active ? 'yes' : 'no'} className={styles.option}
        onPointerDown={(event) => event.preventDefault()}
        onPointerMove={() => { if (!option.disabled) setActive(index); }}
        onClick={(event) => { event.preventDefault();
          event.stopPropagation();
          if (!option.disabled) { props.onChange(option.value);
          setOpen(false);
        }
        }}>
        <span>{option.label}{option.detail ? <small>{option.detail}</small> : null}</span><span aria-hidden="true">{option.value === props.value ? '✓' : ''}</span>
      </div>)}
    </div> : null}
  </div>;
}
