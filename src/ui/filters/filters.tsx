import type { Room, Teacher } from '#schedule/types.ts';

import { Select } from '#ui/select/select.tsx';

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
      <Select label="Преподаватель" value={props.teacherId ?? ''} onChange={(value) => props.onTeacher(value || null)} options={[{ value: '', label: 'Преподаватели' }, ...props.teachers.map((teacher) => ({ value: teacher.id, label: teacher.shortName }))]} />
      <Select label="Аудитория" value={props.roomId ?? ''} onChange={(value) => props.onRoom(value || null)} options={[{ value: '', label: 'Аудитории' }, ...props.rooms.map((room) => ({ value: room.id, label: room.name, detail: `${room.capacity} мест` }))]} />
    </div>
  );
}
