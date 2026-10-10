import type { LessonFields } from './lesson-card.tsx';

import { needsTeacher } from '#ui/teacher-label.ts';
import { ROOM_TYPE_LABELS } from '#ui/room-type.ts';
import { RoomIcon } from './lessonCard.roomIcon.tsx';
import { sectionNumber } from '#ui/section-code.ts';

import styles from './lesson-card.module.css';

type Props = Pick<LessonFields, 'courseCode' | 'courseName' | 'code' | 'teacherName' | 'roomName' | 'roomType'>;

export function LessonFaceBody({ courseCode, courseName, code, teacherName, roomName, roomType }: Props) {
  return (
      <>
        <span className={styles.rail} aria-hidden="true" />
        <span className={styles.head}>
          <span className={styles.chip}>{courseCode}</span>
          <span className={styles.no}>{sectionNumber(courseCode, code)}</span>
          <span className={styles.room} title={`${ROOM_TYPE_LABELS[roomType]}: ${roomName}`}>
            <RoomIcon type={roomType} />
            <span className={styles.sr}>{ROOM_TYPE_LABELS[roomType]}: </span>
            {roomName}
          </span>
        </span>
        <span className={styles.name}>{courseName}</span>
        <span className={styles.foot}>
          <span className={styles.who}>
            {needsTeacher(teacherName) ? <span className={styles.teacherWarning} aria-hidden="true">!</span> : null}
            {teacherName}
          </span>
        </span>
      </>
    );
}
