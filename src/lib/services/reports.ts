import "server-only";

import { createClient } from "@/lib/supabase/server";

type Permissions = Record<string, string[]>;

export interface ReportMetric {
  key: "customers" | "fleet" | "activeRentals" | "overdueRentals" | "outstanding" | "settled";
  label: string;
  value: number;
  format: "count" | "currency";
  helper: string;
}

export interface ReportRow {
  id: string;
  report: "rental" | "invoice" | "settlement";
  reference: string;
  customer: string;
  vehicle: string;
  status: string;
  amount: number;
  occurredAt: string;
}

export interface ReportsOverview {
  metrics: ReportMetric[];
  rows: ReportRow[];
  generatedAt: string;
}

function permissionsFrom(value: unknown): Permissions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, item]) => Array.isArray(item))) as Permissions;
}

function canViewReports(role: string, permissions: Permissions) {
  if (role === "admin" || role === "super_admin") return true;
  const actions = Object.entries(permissions).find(([key]) => key.toLowerCase() === "reports")?.[1] ?? [];
  return actions.some((action) => ["view", "read", "manage"].includes(action.toLowerCase()));
}

function amount(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getReportsOverview(): Promise<ReportsOverview> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("company_id,role,status").eq("id", user.id).is("deleted_at", null).maybeSingle();
  if (profileError || !profile || profile.status !== "active") throw new Error("Active employee profile required");
  const { data: role, error: roleError } = await supabase.from("roles")
    .select("permissions").eq("company_id", profile.company_id).eq("name", profile.role).is("deleted_at", null).maybeSingle();
  if (roleError) throw new Error(roleError.message);
  if (!canViewReports(profile.role, permissionsFrom(role?.permissions))) throw new Error("You do not have permission to view reports");

  const [customersResult, bikesResult, rentalsResult, invoicesResult, settlementsResult] = await Promise.all([
    supabase.from("customers").select("id,full_name", { count: "exact" }).eq("company_id", profile.company_id).is("deleted_at", null).limit(1000),
    supabase.from("bikes").select("id,serial_number,model,status", { count: "exact" }).eq("company_id", profile.company_id).is("deleted_at", null).limit(1000),
    supabase.from("rentals").select("id,rental_number,customer_id,bike_id,status,total_amount,started_at,updated_at").eq("company_id", profile.company_id).is("deleted_at", null).order("updated_at", { ascending: false }).limit(100),
    supabase.from("receivable_invoice_balances").select("invoice_id,invoice_number,customer_id,rental_id,total_amount,balance_due,due_at").eq("company_id", profile.company_id).order("issued_at", { ascending: false }).limit(100),
    supabase.from("rental_settlements").select("id,settlement_number,rental_id,customer_id,amount_due,deposit_refund_due,settled_at").eq("company_id", profile.company_id).order("settled_at", { ascending: false }).limit(100),
  ]);
  const error = customersResult.error ?? bikesResult.error ?? rentalsResult.error ?? invoicesResult.error ?? settlementsResult.error;
  if (error) throw new Error(`Unable to load reports: ${error.message}`);

  const customers = new Map((customersResult.data ?? []).map((row) => [row.id, row.full_name ?? "Unknown"]));
  const vehicles = new Map((bikesResult.data ?? []).map((row) => [row.id, `${row.serial_number ?? "Not assigned"} · ${row.model ?? "Unknown model"}`]));
  const rentals = new Map((rentalsResult.data ?? []).map((row) => [row.id, row.rental_number ?? "Rental"]));
  const openStatuses = new Set(["active", "overdue"]);
  const overdueCount = (rentalsResult.data ?? []).filter((row) => row.status === "overdue").length;
  const outstanding = (invoicesResult.data ?? []).reduce((total, row) => total + amount(row.balance_due), 0);

  const rentalRows: ReportRow[] = (rentalsResult.data ?? []).map((row) => ({
    id: row.id,
    report: "rental",
    reference: row.rental_number ?? "Rental",
    customer: customers.get(row.customer_id) ?? "Unknown",
    vehicle: vehicles.get(row.bike_id) ?? "Unknown vehicle",
    status: String(row.status),
    amount: amount(row.total_amount),
    occurredAt: String(row.updated_at ?? row.started_at),
  }));
  const invoiceRows: ReportRow[] = (invoicesResult.data ?? []).map((row) => ({
    id: row.invoice_id,
    report: "invoice",
    reference: row.invoice_number,
    customer: customers.get(row.customer_id) ?? "Unknown",
    vehicle: rentals.get(row.rental_id) ?? "Unknown rental",
    status: amount(row.balance_due) <= 0 ? "paid" : "due",
    amount: amount(row.total_amount),
    occurredAt: String(row.due_at),
  }));
  const settlementRows: ReportRow[] = (settlementsResult.data ?? []).map((row) => ({
    id: row.id,
    report: "settlement",
    reference: row.settlement_number,
    customer: customers.get(row.customer_id) ?? "Unknown",
    vehicle: rentals.get(row.rental_id) ?? "Unknown rental",
    status: amount(row.amount_due) > 0 ? "amount_due" : amount(row.deposit_refund_due) > 0 ? "refund_due" : "reconciled",
    amount: amount(row.amount_due) || amount(row.deposit_refund_due),
    occurredAt: String(row.settled_at),
  }));

  return {
    metrics: [
      { key: "customers", label: "Customers", value: customersResult.count ?? 0, format: "count", helper: "Company-scoped records" },
      { key: "fleet", label: "Fleet", value: bikesResult.count ?? 0, format: "count", helper: "Registered vehicles" },
      { key: "activeRentals", label: "Open rentals", value: (rentalsResult.data ?? []).filter((row) => openStatuses.has(row.status)).length, format: "count", helper: "Active and overdue" },
      { key: "overdueRentals", label: "Overdue rentals", value: overdueCount, format: "count", helper: "Needs operations follow-up" },
      { key: "outstanding", label: "Outstanding", value: outstanding, format: "currency", helper: "From invoice balances" },
      { key: "settled", label: "Settlements", value: settlementsResult.data?.length ?? 0, format: "count", helper: "Immutable settlement snapshots" },
    ],
    rows: [...rentalRows, ...invoiceRows, ...settlementRows].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 150),
    generatedAt: new Date().toISOString(),
  };
}
