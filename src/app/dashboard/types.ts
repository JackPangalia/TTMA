export type Role = "admin" | "worker";
export type Tab = "tools" | "crew" | "settings";
export type Filter = "all" | "out" | "available";

export interface LogRow {
  id: string;
  toolId: string | null;
  tool: string;
  person: string;
  phone: string;
  group: string | null;
  status: "OUT" | "AVAILABLE";
  checkedOutAt: string;
}

export interface UserRow {
  phone: string;
  name: string;
  group: string | null;
  registeredAt: string;
}
