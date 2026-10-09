import type { Room, Teacher } from '#schedule/types.ts';

import { useEffect, useRef, useState } from 'react';

import styles from '#ui/filters/filters.module.css';

type FiltersProps = {
  teachers: Teacher[]
  rooms: Room[]
  teacherId: string | null
  roomId: string | null
  onTeacher: (id: string | null) => void
  onRoom: (id: string | null) => void
};

export function Filters(props: FiltersProps) {
  return (
    <div className={styles.row}>
      <PickList
        label="Преподаватель"
        value={props.teacherId}
        options={props.teachers.map((teacher) => ({ value: teacher.id, label: teacher.shortName }))}
        onChange={props.onTeacher}
      />
      <PickList
        label="Аудитория"
        value={props.roomId}
        options={props.rooms.map((room) => ({ value: room.id, label: room.name }))}
        onChange={props.onRoom}
      />
    </div>
  );
}

type PickOption = {
  value: string
  label: string
};

type PickListProps = {
  label: string
  value: string | null
  options: PickOption[]
  onChange: (value: string | null) => void
};

function PickList(props: PickListProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = props.options.find((option) => option.value === props.value)?.label ?? 'Все';

  useEffect(() => {
    if (!open) return;

    function onPointer(event: PointerEvent): void {
      if (!(event.target instanceof Node)) return;

      if (root.current?.contains(event.target) === null || root.current?.contains(event.target) === undefined) setOpen(false);
    }

    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.field} ref={root}>
      <span className={styles.caption}>{props.label}</span>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-haspopup="listbox"
        data-active={props.value === null ? 'no' : 'yes'}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.value}>{current}</span>
      </button>
      {open
        ? (
          <div className={styles.menu} role="listbox" aria-label={props.label}>
            <Option
              label="Все"
              selected={props.value === null}
              onPick={() => {
                props.onChange(null);
                setOpen(false);
              }}
            />
            {props.options.map((option) => (
              <Option
                key={option.value}
                label={option.label}
                selected={option.value === props.value}
                onPick={() => {
                  props.onChange(option.value);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        )
        : null}
    </div>
  );
}

type OptionProps = {
  label: string
  selected: boolean
  onPick: () => void
};

function Option(props: OptionProps) {
  return (
    <button
      type="button"
      className={styles.option}
      role="option"
      aria-selected={props.selected}
      onClick={props.onPick}
    >
      <span className={styles.optionLabel}>{props.label}</span>
      {props.selected
        ? (
          <svg className={styles.check} viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="m3.5 8.5 3 3 6-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )
        : null}
    </button>
  );
}
