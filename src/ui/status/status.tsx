import styles from '#ui/status/status.module.css';

type StatusProps = {
  kind: 'loading' | 'error'
  message: string
  onRetry?: () => void
};

export function Status(props: StatusProps) {
  return (
    <div className={styles.screen}>
      <p>{props.kind === 'loading' ? 'Загружаем расписание' : props.message}</p>
      {props.kind === 'error' && props.onRetry
        ? (
          <button type="button" onClick={props.onRetry}>
            Повторить
          </button>
        )
        : null}
    </div>
  );
}
