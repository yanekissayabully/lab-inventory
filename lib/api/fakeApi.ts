import { DATA_KEY, getApiConfig } from "./settings";
import { seedItems } from "./seed";
import type {
  ItemChanges,
  ItemDetails,
  ItemInput,
  ItemSummary,
  StatusFilter,
} from "../types";
import { toSummary } from "../items";

function readData(): ItemDetails[] {
  const raw = localStorage.getItem(DATA_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as ItemDetails[];
    } catch {}
  }
  writeData(seedItems);
  return seedItems;
}

function writeData(items: ItemDetails[]): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(items));
}

function abortError(): DOMException {
  return new DOMException("Request aborted", "AbortError");
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function fakeRequest<T>(operation: () => T, signal?: AbortSignal): Promise<T> {
  const { minDelay, maxDelay, errorChance } = getApiConfig();

  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const delay =
      Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);

      if (Math.random() < errorChance) {
        reject(new Error("Simulated server error. Please try again."));
        return;
      }

      try {
        resolve(operation());
      } catch (error) {
        reject(error);
      }
    }, delay);

    function onAbort() {
      clearTimeout(timer);
      reject(abortError());
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function assertValid(
  items: ItemDetails[],
  candidate: Partial<ItemDetails>,
  id?: number,
) {
  if (candidate.name !== undefined && !candidate.name.trim()) {
    throw new Error("Name is required.");
  }
  if (candidate.serialNumber !== undefined) {
    if (!candidate.serialNumber.trim()) {
      throw new Error("Serial number is required.");
    }
    const taken = items.some(
      (item) => item.id !== id && item.serialNumber === candidate.serialNumber,
    );
    if (taken) {
      throw new Error(
        `Serial number ${candidate.serialNumber} is already in use.`,
      );
    }
  }
}

export function getItems(
  status: StatusFilter = "all",
  signal?: AbortSignal,
): Promise<ItemSummary[]> {
  return fakeRequest(() => {
    return readData()
      .filter((item) => status === "all" || item.status === status)
      .map(toSummary)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, signal);
}

export function getItem(
  id: number,
  signal?: AbortSignal,
): Promise<ItemDetails> {
  return fakeRequest(() => {
    const item = readData().find((item) => item.id === id);
    if (!item) throw new Error("Item not found. It may have been removed.");
    return item;
  }, signal);
}

export function createItem(input: ItemInput): Promise<ItemDetails> {
  return fakeRequest(() => {
    const items = readData();
    assertValid(items, input);

    const created: ItemDetails = {
      ...input,
      id: items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1,
      status: "available",
      assignedTo: null,
    };
    writeData([...items, created]);
    return created;
  });
}

export function updateItem(
  id: number,
  changes: ItemChanges,
): Promise<ItemDetails> {
  return fakeRequest(() => {
    const items = readData();
    const current = items.find((item) => item.id === id);
    if (!current) throw new Error("Item not found. It may have been removed.");
    assertValid(items, changes, id);

    const updated: ItemDetails = { ...current, ...changes, id };
    writeData(items.map((item) => (item.id === id ? updated : item)));
    return updated;
  });
}

export function deleteItem(id: number): Promise<{ id: number }> {
  return fakeRequest(() => {
    const items = readData();
    if (!items.some((item) => item.id === id)) {
      throw new Error("Item not found. It may have been removed.");
    }
    writeData(items.filter((item) => item.id !== id));
    return { id };
  });
}
