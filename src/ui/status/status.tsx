import styles from '#ui/status/status.module.css';

type StatusProps = {
  kind: 'loading' | 'error'
  message: string
  onRetry?: () => void
};

export function Status(props: StatusProps) {
  return (
    <div className={styles.screen}>
      <div className={styles.card} role="status">
        {props.kind === 'loading'
          ? <span className={styles.spinner} aria-hidden="true" />
          : (
            <span className={styles.mark} aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M10 5.8v5M10 13.4v.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}
        <p className={styles.text}>
          {props.kind === 'loading' ? 'Загружаем расписание' : props.message}
        </p>
        {props.kind === 'error' && props.onRetry
          ? (
            <button type="button" className={styles.retry} onClick={props.onRetry}>
              Повторить
            </button>
          )
          : null}
      </div>
    </div>
  );
}
