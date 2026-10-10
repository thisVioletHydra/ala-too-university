import type { EditorView } from './lesson-editor.tsx';

import { teacherOptions, roomOptions } from './lessonEditor.options.ts';
import { TEACHER_PLACEHOLDER } from '#ui/teacher-label.ts';
import { Select } from '#ui/select/select.tsx';

import styles from './lesson-editor.module.css';

type Props = {
  view: EditorView;
  sectionMode: boolean;
  teacherId: string;
  roomId: string;
  onTeacherChange: (value: string) => void;
  onRoomChange: (value: string) => void;
};

export function EditorFields({ view, sectionMode, teacherId, roomId, onTeacherChange, onRoomChange }: Props) {
  const teacherLabel = (
      <span className={styles.teacherLabel}>
        <span className={styles.label}>Преподаватель</span>
        {teacherId === '' ? (
          <span className={styles.teacherNotice} role="status">
            <span className={styles.teacherWarning} aria-hidden="true">!</span>
            {TEACHER_PLACEHOLDER}
          </span>
        ) : null}
      </span>
    );
  return (
      <div className={styles.fields}>
        <label className={styles.field}>
          {teacherLabel}
          <Select
            label="Преподаватель"
            value={teacherId}
            onChange={onTeacherChange}
            options={teacherOptions({ ...view, sectionMode })}
          />
        </label>
        {sectionMode ? null : (
          <label className={styles.field}>
            <span className={styles.label}>Аудитория</span>
            <Select
              label="Аудитория"
              value={roomId}
              onChange={onRoomChange}
              options={roomOptions({ ...view, teacherId })}
            />
          </label>
        )}
      </div>
    );
}
