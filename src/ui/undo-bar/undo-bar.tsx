import styles from '#ui/undo-bar/undo-bar.module.css';

type UndoBarProps = {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
};

export function UndoBar(props: UndoBarProps) {
  return (
    <div className={styles.bar}>
      <button
        type="button"
        disabled={!props.canUndo}
        title={props.canUndo ? 'Отменить' : 'Нечего отменять'}
        onClick={props.onUndo}
      >
        Отменить
      </button>
      <button
        type="button"
        disabled={!props.canRedo}
        title={props.canRedo ? 'Повторить' : 'Нечего повторять'}
        onClick={props.onRedo}
      >
        Повторить
      </button>
    </div>
  );
}
