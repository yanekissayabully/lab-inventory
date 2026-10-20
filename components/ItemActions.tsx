import { useState } from "react";
import styles from "./ItemActions.module.css";

interface ItemActionsProps {
  disabled: boolean;
  removing: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

export default function ItemActions({
  disabled,
  removing,
  onEdit,
  onRemove,
}: ItemActionsProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.secondary}
        onClick={onEdit}
        disabled={disabled}
      >
        Edit
      </button>

      {confirming ? (
        <>
          <button
            type="button"
            className={styles.danger}
            onClick={() => {
              setConfirming(false);
              onRemove();
            }}
            disabled={disabled}
          >
            {removing ? "Removing…" : "Confirm remove"}
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => setConfirming(false)}
          >
            Keep
          </button>
        </>
      ) : (
        <button
          type="button"
          className={styles.secondary}
          onClick={() => setConfirming(true)}
          disabled={disabled}
        >
          {removing ? "Removing…" : "Remove"}
        </button>
      )}
    </div>
  );
}
