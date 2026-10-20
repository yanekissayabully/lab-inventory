"use client";

import { useEffect, useState } from "react";
import { getItem, getItems, isAbortError } from "@/lib/api/fakeApi";
import { STATUSES, type ItemSummary, type StatusFilter } from "@/lib/types";
import ItemDetails, { type DetailsState } from "./ItemDetails";
import ItemList, { type LoadStatus } from "./ItemList";
import { statusLabel } from "./StatusBadge";
import styles from "./Inventory.module.css";

export default function Inventory() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [listStatus, setListStatus] = useState<LoadStatus>("loading");
  const [listError, setListError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<DetailsState>({ status: "idle" });
  const [detailsReloadKey, setDetailsReloadKey] = useState(0);

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

  // Load the details of the selected item. The effect re-runs when the
  // selection changes; its cleanup cancels the previous request and flags it
  // as stale, so a slow response for item A can never overwrite item B.
  useEffect(() => {
    if (selectedId === null) return;

    const controller = new AbortController();
    let ignore = false;

    getItem(selectedId, controller.signal)
      .then((item) => {
        if (ignore) return;
        setDetails({ status: "success", item });
      })
      .catch((error: unknown) => {
        if (ignore || isAbortError(error)) return;
        setDetails({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedId, detailsReloadKey]);

  function changeFilter(next: StatusFilter) {
    setFilter(next);
    setListStatus("loading");
  }

  function reload() {
    setListStatus("loading");
    setReloadKey((key) => key + 1);
  }

  function select(id: number) {
    if (id === selectedId) return;
    setSelectedId(id);
    setDetails({ status: "loading" });
  }

  function reloadDetails() {
    setDetails({ status: "loading" });
    setDetailsReloadKey((key) => key + 1);
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>Lab Inventory</h1>
        <p className={styles.subtitle}>
          Track who has what, and what is out of service.
        </p>
      </header>

      <div className={styles.layout}>
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
            selectedId={selectedId}
            onSelect={select}
            onReload={reload}
          />
        </section>

        <section
          className={styles.panel}
          aria-labelledby="details-heading"
          aria-live="polite"
        >
          <div className={styles.toolbar}>
            <h2 id="details-heading" className={styles.panelTitle}>
              Details
            </h2>
          </div>
          <ItemDetails state={details} onRetry={reloadDetails} />
        </section>
      </div>
    </div>
  );
}
