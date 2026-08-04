import {
  LayoutDashboard,
  CalendarCheck,
  HandCoins,
  Users,
  Zap,
  KeyRound,
  Wrench,
  UserCheck,
  Briefcase,
  BarChart3,
  Bell,
  Settings,
} from "lucide-react";
import type { NavItem } from "@/types";

export const APP_NAME = "Evo Rentals";
export const APP_DESCRIPTION = "Fleet Management ERP for Electric Two-Wheelers";

export const sidebarNavItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Rent Collections", href: "/payments", icon: HandCoins, badge: 23 },
  { title: "Bookings", href: "/bookings", icon: CalendarCheck },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Fleet Management", href: "/fleet", icon: Zap },
  { title: "Rentals", href: "/rentals", icon: KeyRound },
  { title: "Service & Maintenance", href: "/service", icon: Wrench },
  { title: "Drivers", href: "/drivers", icon: UserCheck },
  { title: "Employees", href: "/employees", icon: Briefcase },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "Settings", href: "/settings", icon: Settings },
];

export const CHART_COLORS = {
  blue: "#3B82F6",
  green: "#10B981",
  purple: "#8B5CF6",
  orange: "#F59E0B",
  red: "#EF4444",
  cyan: "#06B6D4",
  pink: "#EC4899",
  indigo: "#6366F1",
} as const;

export const CHART_COLOR_ARRAY = [
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#EC4899",
  "#6366F1",
];

export const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  inactive: {
    label: "Inactive",
    className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  completed: {
    label: "Completed",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  },
  "in-progress": {
    label: "In Progress",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  maintenance: {
    label: "Maintenance",
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  available: {
    label: "Available",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  rented: {
    label: "Rented",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  reserved: {
    label: "Reserved",
    className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  },
  retired: {
    label: "Retired",
    className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  unpaid: {
    label: "Unpaid",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  partial: {
    label: "Partial",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
};
