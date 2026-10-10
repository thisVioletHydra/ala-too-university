import { useEffect, useState } from 'react';
import { subscribeAnnouncements } from './reader.announcements.ts';

import styles from './reader.module.css';

export function ReaderStatus() {
  const [message, setMessage] = useState({ text: '', sequence: 0 });
  useEffect(() => subscribeAnnouncements((text) => {
    setMessage((previous) => ({ text, sequence: previous.sequence + 1 }));
  }), []);

  return <div className={styles.status} role="status" aria-live="polite" aria-atomic="true">
    <span key={message.sequence}>{message.text}</span>
  </div>;
}
