import styles from '#ui/undo-bar/undo-bar.module.css';

type UndoBarProps = {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
};

function ArrowIcon(props: { flip: boolean }) {
  return (
    <svg
      className={styles.icon}
      data-flip={props.flip ? 'yes' : 'no'}
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        d="M7.5 5.2 4 8.7l3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 8.7h7.2a4.4 4.4 0 0 1 0 8.8H8.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UndoBar(props: UndoBarProps) {
  return (
    <div className={styles.bar}>
      <button
        type="button"
        disabled={!props.canUndo}
        title={props.canUndo ? 'Отменить' : 'Нечего отменять'}
        onClick={props.onUndo}
      >
        <ArrowIcon flip={false} />
        Отменить
      </button>
      <button
        type="button"
        disabled={!props.canRedo}
        title={props.canRedo ? 'Повторить' : 'Нечего повторять'}
        onClick={props.onRedo}
      >
        <ArrowIcon flip />
        Повторить
      </button>
    </div>
  );
}
