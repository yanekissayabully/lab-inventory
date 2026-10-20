"use client";

import { useEffect, useState } from "react";
import { getItems, isAbortError } from "@/lib/api/fakeApi";
import { STATUSES, type ItemSummary, type StatusFilter } from "@/lib/types";
import ItemList, { type LoadStatus } from "./ItemList";
import { statusLabel } from "./StatusBadge";
import styles from "./Inventory.module.css";

export default function Inventory() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [listStatus, setListStatus] = useState<LoadStatus>("loading");
  const [listError, setListError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Load the list whenever the filter changes or the user hits Reload.
  // Both values are read inside the effect, so both are dependencies.
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    getItems(filter, controller.signal)
      .then((data) => {
        if (ignore) return;
        setItems(data);
        setListStatus("success");
      })
      .catch((error: unknown) => {
        if (ignore || isAbortError(error)) return;
        setListError(error instanceof Error ? error.message : "Unknown error");
        setListStatus("error");
      });

    // Cleanup runs before the next effect and on unmount: a superseded
    // request is cancelled and, if it still got through, its result is dropped.
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [filter, reloadKey]);

  function changeFilter(next: StatusFilter) {
    setFilter(next);
    setListStatus("loading");
  }

  function reload() {
    setListStatus("loading");
    setReloadKey((key) => key + 1);
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>Lab Inventory</h1>
        <p className={styles.subtitle}>
          Track who has what, and what is out of service.
        </p>
      </header>

      <section className={styles.panel} aria-labelledby="list-heading">
        <div className={styles.toolbar}>
          <h2 id="list-heading" className={styles.panelTitle}>
            Equipment
          </h2>
          <label className={styles.filter}>
            <span className={styles.visuallyHidden}>Filter by status</span>
            <select
              value={filter}
              onChange={(e) => changeFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={styles.button}
            onClick={reload}
            disabled={listStatus === "loading"}
          >
            {listStatus === "loading" ? "Loading…" : "Reload"}
          </button>
        </div>
        <ItemList
          items={items}
          status={listStatus}
          error={listError}
          filter={filter}
          onReload={reload}
        />
      </section>
    </div>
  );
}
