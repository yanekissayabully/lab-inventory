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

export interface ItemSummary {
  id: number;
  name: string;
  description: string;
  category: Category;
  status: Status;
}

export interface ItemDetails extends ItemSummary {
  serialNumber: string;
  location: string;
  assignedTo: string | null;
  purchasedAt: string;
  lastServiceAt: string | null;
  valueUsd: number;
  notes: string;
}

export type ItemInput = Omit<ItemDetails, "id" | "status" | "assignedTo">;

export type ItemChanges = Partial<Omit<ItemDetails, "id">>;

export type StatusFilter = Status | "all";
