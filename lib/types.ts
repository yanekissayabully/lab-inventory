export const STATUSES = ["available", "checked-out", "maintenance"] as const;
export type Status = (typeof STATUSES)[number];

export const CATEGORIES = [
  "Electronics",
  "Fabrication",
  "Imaging",
  "Computing",
  "Tools",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** What the list endpoint returns: enough to render a row. */
export interface ItemSummary {
  id: number;
  name: string;
  description: string;
  category: Category;
  status: Status;
}

/** What the single-item endpoint returns: the full record. */
export interface ItemDetails extends ItemSummary {
  serialNumber: string;
  location: string;
  assignedTo: string | null;
  purchasedAt: string; // YYYY-MM-DD
  lastServiceAt: string | null; // YYYY-MM-DD
  valueUsd: number;
  notes: string;
}

/** Fields the user edits in the form. Status and assignee go through actions. */
export type ItemInput = Omit<ItemDetails, "id" | "status" | "assignedTo">;

export type ItemChanges = Partial<Omit<ItemDetails, "id">>;

export type StatusFilter = Status | "all";
