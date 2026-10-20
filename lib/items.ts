import type {
  ItemDetails,
  ItemInput,
  ItemSummary,
  StatusFilter,
} from "./types";

export function toSummary(item: ItemDetails): ItemSummary {
  const { id, name, description, category, status } = item;
  return { id, name, description, category, status };
}

export function toInput(item: ItemDetails): ItemInput {
  const { name, description, category, serialNumber, location, purchasedAt } =
    item;
  const { lastServiceAt, valueUsd, notes } = item;
  return {
    name,
    description,
    category,
    serialNumber,
    location,
    purchasedAt,
    lastServiceAt,
    valueUsd,
    notes,
  };
}

export function matchesFilter(
  item: ItemSummary,
  filter: StatusFilter,
): boolean {
  return filter === "all" || item.status === filter;
}

export function byName(a: ItemSummary, b: ItemSummary): number {
  return a.name.localeCompare(b.name);
}
