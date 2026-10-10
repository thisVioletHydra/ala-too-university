const announcements = new EventTarget();

export function announce(message: string): void {
  announcements.dispatchEvent(new CustomEvent<string>('message', { detail: message }));
}

export function subscribeAnnouncements(listener: (message: string) => void): () => void {
  function receive(event: Event): void {
    if (event instanceof CustomEvent && typeof event.detail === 'string') listener(event.detail);
  }

  announcements.addEventListener('message', receive);
  return () => announcements.removeEventListener('message', receive);
}
