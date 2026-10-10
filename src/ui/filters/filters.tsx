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

export function Filters({ teachers, rooms, teacherId, roomId, onTeacher, onRoom }: FiltersProps) {
  const teacherOptions = [{ value: '', label: 'Преподаватели' }, ...teachers.map((teacher) => ({ value: teacher.id, label: teacher.shortName }))];
  const roomOptions = [{ value: '', label: 'Аудитории' }, ...rooms.map((room) => ({ value: room.id, label: room.name, detail: `${room.capacity} мест` }))];

  return (
    <div className={styles.row}>
      <Select label="Преподаватель" value={teacherId ?? ''} onChange={(value) => onTeacher(value || null)} options={teacherOptions} />
      <Select label="Аудитория" value={roomId ?? ''} onChange={(value) => onRoom(value || null)} options={roomOptions} />
    </div>
  );
}
