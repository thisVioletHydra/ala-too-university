import type { ReactNode } from 'react';
import type { RoomType } from '#schedule/types.ts';

import styles from '#ui/lesson-card/lesson-card.module.css';

type RoomIconProps = {
  type: RoomType
};

const ROOM_ICONS: Record<RoomType, ReactNode> = {
  COMPUTER_LAB: (
    <>
      <rect x="3" y="3" width="10" height="7" rx="1" />
      <path d="m3 10-1 3h12l-1-3M6 12h4" />
    </>
  ),
  LECTURE: (
    <>
      <rect x="2" y="2" width="12" height="8" rx="1" />
      <path d="M8 10v4m-3 0 3-2 3 2M5 5h6" />
    </>
  ),
};

export function RoomIcon({ type }: RoomIconProps) {
  return (
    <svg
      className={styles.roomIcon}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ROOM_ICONS[type]}
    </svg>
  );
}
