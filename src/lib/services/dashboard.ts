import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { KycStatus } from "@/lib/services/customers";

export interface DashboardMetric {
  key: "customers" | "fleet" | "available" | "activeRentals" | "pendingKyc";
  label: string;
  value: number;
  helper: string;
  href: string;
  tone: "blue" | "green" | "amber" | "red" | "purple";
}

export interface DashboardCustomer {
  id: string;
  customerNumber: string;
  fullName: string;
  phone: string | null;
  kycStatus: KycStatus;
  createdAt: string;
}

export interface DashboardActivity {
  id: string;
  summary: string;
  eventType: string;
  occurredAt: string;
}

export interface DashboardOverview {
  metrics: DashboardMetric[];
  kyc: Record<KycStatus, number>;
  recentCustomers: DashboardCustomer[];
  recentActivity: DashboardActivity[];
  generatedAt: string;
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const supabase = await createClient();
  const countQuery = (status?: KycStatus) => {
    // Use a bounded GET instead of a HEAD request. PostgREST can reject an
    // otherwise valid session for the unfiltered HEAD variant while the same
    // table is readable through normal GET requests. The exact count is still
    // returned in the Content-Range header, but only one row is transferred.
    let query = supabase.from("customers").select("id", { count: "exact" }).is("deleted_at", null).limit(1);
    if (status) query = query.eq("kyc_status", status);
    return query;
  };

  const [totalResult, verifiedResult, pendingResult, rejectedResult, expiredResult, fleetResult, availableResult, activeRentalsResult, customersResult, activityResult] = await Promise.all([
    queryWithAuthRetry(supabase, "customers_total", () => countQuery()),
    queryWithAuthRetry(supabase, "customers_verified", () => countQuery("verified")),
    queryWithAuthRetry(supabase, "customers_pending", () => countQuery("pending")),
    queryWithAuthRetry(supabase, "customers_rejected", () => countQuery("rejected")),
    queryWithAuthRetry(supabase, "customers_expired", () => countQuery("expired")),
    // Use bounded GET counts for every dashboard KPI. The authenticated
    // PostgREST HEAD variant can intermittently return 401 immediately after
    // login even when the same table is readable through GET, which would
    // otherwise turn one transient count into a full dashboard 500.
    queryWithAuthRetry(supabase, "bikes_total", () => supabase.from("bikes").select("id", { count: "exact" }).is("deleted_at", null).limit(1)),
    queryWithAuthRetry(supabase, "bikes_available", () => supabase.from("bikes").select("id", { count: "exact" }).is("deleted_at", null).eq("status", "available").limit(1)),
    queryWithAuthRetry(supabase, "rentals_active", () => supabase.from("rentals").select("id", { count: "exact" }).is("deleted_at", null).eq("status", "active").limit(1)),
    queryWithAuthRetry(supabase, "customers_recent", () => supabase.from("customers").select("id,customer_number,full_name,phone,kyc_status,created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(6)),
    queryWithAuthRetry(supabase, "customer_timeline_recent", () => supabase.from("customer_timeline_events").select("id,event_type,summary,occurred_at").order("occurred_at", { ascending: false }).limit(6)),
  ]);

  const results = [totalResult, verifiedResult, pendingResult, rejectedResult, expiredResult, fleetResult, availableResult, activeRentalsResult, customersResult, activityResult];
  const failed = results.find((result) => result.error);
  if (failed?.error && !isAuthError(failed.error)) {
    throw new Error(`Unable to load dashboard: ${formatQueryError(failed.error)}`);
  }

  const total = totalResult.count ?? 0;
  const kyc = {
    verified: verifiedResult.count ?? 0,
    pending: pendingResult.count ?? 0,
    rejected: rejectedResult.count ?? 0,
    expired: expiredResult.count ?? 0,
  };
  return {
    metrics: [
      { key: "customers", label: "Total customers", value: total, helper: "Live customer records", href: "/customers", tone: "blue" },
      { key: "fleet", label: "Total fleet", value: fleetResult.count ?? 0, helper: "Live vehicle records", href: "/fleet", tone: "purple" },
      { key: "available", label: "Available vehicles", value: availableResult.count ?? 0, helper: "Ready for assignment", href: "/fleet", tone: "green" },
      { key: "activeRentals", label: "Active rentals", value: activeRentalsResult.count ?? 0, helper: "Currently on rent", href: "/rentals", tone: "blue" },
      { key: "pendingKyc", label: "Awaiting KYC", value: kyc.pending, helper: `${percent(kyc.pending, total)} · review queue`, href: "/customers", tone: "amber" },
    ],
    kyc,
    recentCustomers: (customersResult.data ?? []).map((row) => ({
      id: row.id,
      customerNumber: row.customer_number,
      fullName: row.full_name,
      phone: row.phone,
      kycStatus: row.kyc_status as KycStatus,
      createdAt: row.created_at,
    })),
    recentActivity: (activityResult.data ?? []).map((row) => ({
      id: row.id,
      summary: row.summary,
      eventType: row.event_type,
      occurredAt: row.occurred_at,
    })),
    generatedAt: new Date().toISOString(),
  };
}

function percent(value: number, total: number) {
  return total === 0 ? "No records yet" : `${Math.round((value / total) * 100)}% of customer base`;
}

type DashboardQueryResult = {
  error: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null; status?: number | null } | null;
};

async function queryWithAuthRetry<T extends DashboardQueryResult>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  label: string,
  query: () => PromiseLike<T>,
): Promise<T> {
  const first = await query();
  if (!first.error || !isAuthError(first.error)) return first;

  console.warn("[dashboard] retrying auth-failed query", { label, error: first.error });
  await supabase.auth.getUser();
  const retry = await query();
  if (retry.error) {
    console.error("[dashboard] query unavailable after auth retry", { label, error: retry.error });
  }
  return retry;
}

function isAuthError(error: DashboardQueryResult["error"]) {
  if (!error) return false;
  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return error.status === 401 || error.code === "PGRST301" || message.includes("jwt") || message.includes("token");
}

function formatQueryError(error: NonNullable<DashboardQueryResult["error"]>) {
  return [error.message, error.code, error.details, error.hint].filter(Boolean).join(" | ") || "unknown database error";
}
