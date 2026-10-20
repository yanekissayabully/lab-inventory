import type { ItemSummary, StatusFilter } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import styles from "./ItemList.module.css";

export type LoadStatus = "loading" | "error" | "success";

interface ItemListProps {
  items: ItemSummary[];
  status: LoadStatus;
  error: string;
  filter: StatusFilter;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onReload: () => void;
}

export default function ItemList({
  items,
  status,
  error,
  filter,
  selectedId,
  onSelect,
  onReload,
}: ItemListProps) {
  if (status === "error") {
    return (
      <div className={styles.message} role="alert">
        <p className={styles.messageTitle}>Could not load the list</p>
        <p className={styles.messageText}>{error}</p>
        <button
          type="button"
          className={styles.messageAction}
          onClick={onReload}
        >
          Try again
        </button>
      </div>
    );
  }

  if (status === "loading" && items.length === 0) {
    return (
      <div
        className={styles.skeletons}
        aria-busy="true"
        aria-label="Loading items"
      >
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={styles.skeleton} />
        ))}
      </div>
    );
  }

  if (status === "success" && items.length === 0) {
    return (
      <div className={styles.message}>
        <p className={styles.messageTitle}>
          {filter === "all" ? "No equipment yet" : "Nothing with this status"}
        </p>
        <p className={styles.messageText}>
          {filter === "all"
            ? "The inventory is empty."
            : "Try another filter, or reload the list."}
        </p>
      </div>
    );
  }

  return (
    <ul
      className={`${styles.list} ${status === "loading" ? styles.refreshing : ""}`}
      aria-busy={status === "loading"}
    >
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={`${styles.row} ${item.id === selectedId ? styles.selected : ""}`}
            aria-current={item.id === selectedId}
            onClick={() => onSelect(item.id)}
          >
            <span className={styles.rowMain}>
              <span className={styles.name}>{item.name}</span>
              <span className={styles.meta}>{item.category}</span>
            </span>
            <StatusBadge status={item.status} />
          </button>
        </li>
      ))}
    </ul>
  );
}
