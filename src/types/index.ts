import { type LucideIcon } from "lucide-react";

// ─── Navigation ──────────────────────────────────────────────────
export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  children?: NavItem[];
  disabled?: boolean;
}

export interface BreadcrumbItem {
  title: string;
  href?: string;
}

// ─── Dashboard ───────────────────────────────────────────────────
export interface KPIData {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
  icon: LucideIcon;
  color: "blue" | "green" | "purple" | "orange" | "red" | "cyan";
  sparklineData?: number[];
  prefix?: string;
  suffix?: string;
}

export interface MetricData {
  id: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  progress?: number;
  color: "blue" | "green" | "purple" | "orange" | "red" | "cyan";
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: "blue" | "green" | "purple" | "orange";
}

export interface ActivityItem {
  id: string;
  user: {
    name: string;
    avatar?: string;
  };
  action: string;
  target: string;
  timestamp: string;
  type: "booking" | "payment" | "vehicle" | "customer" | "service" | "system";
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "info" | "success" | "warning" | "error";
  actionUrl?: string;
}

// ─── Data Table ──────────────────────────────────────────────────
export type StatusVariant =
  | "active"
  | "inactive"
  | "pending"
  | "completed"
  | "overdue"
  | "cancelled"
  | "in-progress"
  | "maintenance"
  | "available"
  | "rented"
  | "reserved"
  | "paid"
  | "unpaid"
  | "partial";

export interface TableFilterOption {
  label: string;
  value: string;
  icon?: LucideIcon;
}

// ─── Charts ──────────────────────────────────────────────────────
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

// ─── Common ──────────────────────────────────────────────────────
export interface Branch {
  id: string;
  name: string;
  code: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  branch?: Branch;
}
