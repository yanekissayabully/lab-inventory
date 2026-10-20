"use client";

import { useEffect, useState } from "react";
import {
  createItem,
  deleteItem,
  getItem,
  getItems,
  isAbortError,
  updateItem,
} from "@/lib/api/fakeApi";
import { byName, matchesFilter, toInput, toSummary } from "@/lib/items";
import { statusChanges, type StatusAction } from "@/lib/status";
import {
  STATUSES,
  type ItemDetails as ItemDetailsData,
  type ItemInput,
  type ItemSummary,
  type StatusFilter,
} from "@/lib/types";
import ItemActions from "./ItemActions";
import StatusControls from "./StatusControls";
import ItemDetails, { type DetailsState } from "./ItemDetails";
import ItemForm, { EMPTY_INPUT } from "./ItemForm";
import ItemList, { type LoadStatus } from "./ItemList";
import Simulator from "./Simulator";
import { statusLabel } from "./StatusBadge";
import styles from "./Inventory.module.css";

type FormState = { mode: "create" } | { mode: "edit"; id: number };

/** The one mutation currently in flight. `id` is the item it targets. */
interface Busy {
  kind: "create" | "save" | "status" | "remove";
  id: number | null;
}

interface Notice {
  kind: "success" | "error";
  text: string;
}

// On a narrow screen the details panel sits below the list, out of view.
function scrollToDetailsOnSmallScreens() {
  if (!window.matchMedia("(max-width: 800px)").matches) return;
  document
    .getElementById("details-heading")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export default function Inventory() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [listStatus, setListStatus] = useState<LoadStatus>("loading");
  const [listError, setListError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<DetailsState>({ status: "idle" });
  const [detailsReloadKey, setDetailsReloadKey] = useState(0);

  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState<Busy | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

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
        setListError(messageOf(error));
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
        setDetails({ status: "error", message: messageOf(error) });
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedId, detailsReloadKey]);

  // Notices dismiss themselves; the cleanup stops a pending timer when a
  // newer notice replaces this one or the component unmounts.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const visibleItems = items.filter((item) => matchesFilter(item, filter));
  const shownDetails: DetailsState =
    selectedId === null ? { status: "idle" } : details;
  const mutating = busy !== null;
  // While a form submit is in flight the selection must not move, otherwise
  // the response would land on an item the user is no longer looking at.
  const selectionLocked = busy?.kind === "create" || busy?.kind === "save";

  function changeFilter(next: StatusFilter) {
    setFilter(next);
    setListStatus("loading");
  }

  function reload() {
    setListStatus("loading");
    setReloadKey((key) => key + 1);
  }

  function select(id: number) {
    if (selectionLocked || id === selectedId) return;
    setSelectedId(id);
    setDetails({ status: "loading" });
    setForm(null);
    scrollToDetailsOnSmallScreens();
  }

  function reloadDetails() {
    setDetails({ status: "loading" });
    setDetailsReloadKey((key) => key + 1);
  }

  /** Mirror a server-confirmed record into the list and the details panel. */
  function applyUpdated(updated: ItemDetailsData) {
    setItems((prev) =>
      prev.map((item) => (item.id === updated.id ? toSummary(updated) : item)),
    );
    setDetails((prev) =>
      prev.status === "success" && prev.item.id === updated.id
        ? { status: "success", item: updated }
        : prev,
    );
  }

  async function handleCreate(input: ItemInput) {
    setBusy({ kind: "create", id: null });
    try {
      const created = await createItem(input);
      // The filter select is disabled while busy, so `filter` is still the
      // value the user saw when they submitted.
      if (filter === "all" || filter === created.status) {
        setItems((prev) => [...prev, toSummary(created)].sort(byName));
      } else {
        setFilter("all");
        setListStatus("loading");
      }
      setSelectedId(created.id);
      setDetails({ status: "loading" });
      setForm(null);
      setNotice({ kind: "success", text: `Added “${created.name}”.` });
    } catch (error) {
      setNotice({ kind: "error", text: messageOf(error) });
    } finally {
      setBusy(null);
    }
  }

  async function handleSave(id: number, input: ItemInput) {
    setBusy({ kind: "save", id });
    try {
      const updated = await updateItem(id, input);
      setItems((prev) =>
        prev
          .map((item) => (item.id === id ? toSummary(updated) : item))
          .sort(byName),
      );
      applyUpdated(updated);
      setForm(null);
      setNotice({ kind: "success", text: `Saved “${updated.name}”.` });
    } catch (error) {
      setNotice({ kind: "error", text: messageOf(error) });
    } finally {
      setBusy(null);
    }
  }

  async function handleStatus(action: StatusAction) {
    if (details.status !== "success" || mutating) return;
    // Capture the target now. By the time the response arrives the user may
    // have selected a different item, and `details` in this closure is the
    // render the click happened in, not the current one.
    const { id, name } = details.item;

    setBusy({ kind: "status", id });
    try {
      const updated = await updateItem(id, statusChanges(action));
      applyUpdated(updated);
      setNotice({
        kind: "success",
        text: `“${name}” is now ${statusLabel(updated.status).toLowerCase()}.`,
      });
    } catch (error) {
      setNotice({ kind: "error", text: `“${name}”: ${messageOf(error)}` });
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove() {
    if (details.status !== "success" || mutating) return;
    const { id, name } = details.item;

    setBusy({ kind: "remove", id });
    try {
      await deleteItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedId((current) => (current === id ? null : current));
      setNotice({ kind: "success", text: `Removed “${name}”.` });
    } catch (error) {
      setNotice({ kind: "error", text: messageOf(error) });
    } finally {
      setBusy(null);
    }
  }

  function renderDetailsPanel() {
    if (form?.mode === "create") {
      return (
        <ItemForm
          key="create"
          title="New equipment"
          submitLabel="Add item"
          initial={EMPTY_INPUT}
          saving={busy?.kind === "create"}
          onSubmit={handleCreate}
          onCancel={() => setForm(null)}
        />
      );
    }

    if (form?.mode === "edit" && shownDetails.status === "success") {
      const { item } = shownDetails;
      return (
        <ItemForm
          key={`edit-${item.id}`}
          title={`Edit ${item.name}`}
          submitLabel="Save changes"
          initial={toInput(item)}
          saving={busy?.kind === "save"}
          onSubmit={(input) => handleSave(item.id, input)}
          onCancel={() => setForm(null)}
        />
      );
    }

    return (
      <>
        <ItemDetails state={shownDetails} onRetry={reloadDetails} />
        {shownDetails.status === "success" && (
          <StatusControls
            key={`${shownDetails.item.id}-${shownDetails.item.status}`}
            item={shownDetails.item}
            disabled={mutating}
            updating={
              busy?.kind === "status" && busy.id === shownDetails.item.id
            }
            onAction={handleStatus}
          />
        )}
        {shownDetails.status === "success" && (
          <ItemActions
            key={shownDetails.item.id}
            disabled={mutating}
            removing={
              busy?.kind === "remove" && busy.id === shownDetails.item.id
            }
            onEdit={() => setForm({ mode: "edit", id: shownDetails.item.id })}
            onRemove={handleRemove}
          />
        )}
      </>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Lab Inventory</h1>
          <p className={styles.subtitle}>
            Track who has what, and what is out of service.
          </p>
        </div>
        <Simulator />
      </header>

      {notice && (
        <div
          className={`${styles.notice} ${styles[notice.kind]}`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            className={styles.noticeClose}
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

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
                disabled={mutating}
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
            <button
              type="button"
              className={styles.primary}
              onClick={() => setForm({ mode: "create" })}
              disabled={mutating}
            >
              New item
            </button>
          </div>
          <ItemList
            items={visibleItems}
            status={listStatus}
            error={listError}
            filter={filter}
            selectedId={selectedId}
            busyId={busy?.id ?? null}
            locked={selectionLocked}
            onSelect={select}
            onReload={reload}
          />
        </section>

        <section className={styles.panel} aria-labelledby="details-heading">
          <div className={styles.toolbar}>
            <h2 id="details-heading" className={styles.panelTitle}>
              Details
            </h2>
          </div>
          {renderDetailsPanel()}
        </section>
      </div>
    </div>
  );
}
