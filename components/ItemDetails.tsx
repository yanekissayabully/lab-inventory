import type { ItemDetails as ItemDetailsData } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import styles from "./ItemDetails.module.css";

export type DetailsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; item: ItemDetailsData };

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface ItemDetailsProps {
  state: DetailsState;
  onRetry: () => void;
}

export default function ItemDetails({ state, onRetry }: ItemDetailsProps) {
  if (state.status === "idle") {
    return (
      <div className={styles.message}>
        <p className={styles.messageTitle}>Nothing selected</p>
        <p className={styles.messageText}>
          Pick an item from the list to see its details.
        </p>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div
        className={styles.skeletons}
        aria-busy="true"
        aria-label="Loading details"
      >
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={styles.message} role="alert">
        <p className={styles.messageTitle}>Could not load details</p>
        <p className={styles.messageText}>{state.message}</p>
        <button
          type="button"
          className={styles.messageAction}
          onClick={onRetry}
        >
          Try again
        </button>
      </div>
    );
  }

  const { item } = state;

  return (
    <article className={styles.details}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h3 className={styles.name}>{item.name}</h3>
          <StatusBadge status={item.status} />
        </div>
        <p className={styles.description}>{item.description}</p>
      </header>

      <dl className={styles.fields}>
        <Field label="Category" value={item.category} />
        <Field label="Serial number" value={item.serialNumber} />
        <Field label="Location" value={item.location} />
        <Field label="Assigned to" value={item.assignedTo ?? "Nobody"} />
        <Field label="Purchased" value={formatDate(item.purchasedAt)} />
        <Field label="Last serviced" value={formatDate(item.lastServiceAt)} />
        <Field label="Value" value={money.format(item.valueUsd)} />
        <Field label="Notes" value={item.notes || "—"} wide />
      </dl>
    </article>
  );
}

function Field({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? styles.fieldWide : styles.field}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{value}</dd>
    </div>
  );
}
