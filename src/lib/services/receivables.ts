import "server-only";

import { createClient } from "@/lib/supabase/server";

type Permissions = Record<string, string[]>;

export interface ReceivableInvoice {
  id: string;
  number: string;
  customer: string;
  rental: string;
  issuedAt: string;
  dueAt: string;
  total: number;
  allocated: number;
  balance: number;
  status: "paid" | "due" | "overdue";
}

export interface ReceivablePayment {
  id: string;
  number: string;
  customer: string;
  amount: number;
  method: string;
  collectedAt: string;
}

export interface ReceivablesWorkspaceData {
  invoices: ReceivableInvoice[];
  payments: ReceivablePayment[];
  canManage: boolean;
  totals: { invoiced: number; collected: number; outstanding: number; overdue: number; refunds: number };
}

const amount = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

function permissionsFrom(value: unknown): Permissions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, item]) => Array.isArray(item))) as Permissions;
}

function allowed(role: string, permissions: Permissions, actions: string[]) {
  if (role === "admin" || role === "super_admin") return true;
  const available = Object.entries(permissions).find(([key]) => key.toLowerCase() === "payments")?.[1] ?? [];
  return available.some((entry) => actions.some((action) => entry.toLowerCase() === action.toLowerCase()));
}

export async function getReceivablesWorkspace(): Promise<ReceivablesWorkspaceData> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("company_id,role,status").eq("id", user.id).is("deleted_at", null).maybeSingle();
  if (profileError || !profile || profile.status !== "active") throw new Error("Active employee profile required");
  const { data: roleRow, error: roleError } = await supabase.from("roles")
    .select("permissions").eq("company_id", profile.company_id).eq("name", profile.role).is("deleted_at", null).maybeSingle();
  if (roleError) throw new Error(roleError.message);
  const permissions = permissionsFrom(roleRow?.permissions);
  if (!allowed(profile.role, permissions, ["View", "Create", "Edit", "Manage"])) throw new Error("You do not have permission to view collections");

  const [balancesResult, paymentsResult, refundsResult] = await Promise.all([
    supabase.from("receivable_invoice_balances")
      .select("invoice_id,customer_id,rental_id,invoice_number,issued_at,due_at,total_amount,allocated_amount,balance_due")
      .eq("company_id", profile.company_id).order("issued_at", { ascending: false }),
    supabase.from("receivable_payments")
      .select("id,payment_number,amount,method,collected_at,customers(full_name)")
      .eq("company_id", profile.company_id).order("collected_at", { ascending: false }).limit(20),
    supabase.from("receivable_refunds").select("amount").eq("company_id", profile.company_id),
  ]);
  const error = balancesResult.error ?? paymentsResult.error ?? refundsResult.error;
  if (error) throw new Error(`Unable to load collections: ${error.message}`);

  const balanceRows = (balancesResult.data ?? []) as unknown as Record<string, unknown>[];
  const customerIds = [...new Set(balanceRows.map((row) => String(row.customer_id)))];
  const rentalIds = [...new Set(balanceRows.map((row) => String(row.rental_id)))];
  const [customersResult, rentalsResult] = await Promise.all([
    customerIds.length ? supabase.from("customers").select("id,full_name").eq("company_id", profile.company_id).in("id", customerIds) : Promise.resolve({ data: [], error: null }),
    rentalIds.length ? supabase.from("rentals").select("id,rental_number").eq("company_id", profile.company_id).in("id", rentalIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (customersResult.error || rentalsResult.error) throw new Error(`Unable to load collection references: ${customersResult.error?.message ?? rentalsResult.error?.message}`);
  const customerNames = new Map((customersResult.data ?? []).map((row) => [row.id, row.full_name]));
  const rentalNumbers = new Map((rentalsResult.data ?? []).map((row) => [row.id, row.rental_number]));

  const now = Date.now();
  const invoices = balanceRows.map((row) => {
    const balance = amount(row.balance_due);
    return {
      id: String(row.invoice_id), number: String(row.invoice_number), customer: customerNames.get(String(row.customer_id)) ?? "Unknown",
      rental: rentalNumbers.get(String(row.rental_id)) ?? "Unknown", issuedAt: String(row.issued_at), dueAt: String(row.due_at),
      total: amount(row.total_amount), allocated: amount(row.allocated_amount), balance,
      status: balance <= 0 ? "paid" : new Date(String(row.due_at)).getTime() < now ? "overdue" : "due",
    } satisfies ReceivableInvoice;
  });
  const payments = ((paymentsResult.data ?? []) as unknown as Record<string, unknown>[]).map((row) => {
    const customer = row.customers as Record<string, unknown> | null;
    return { id: String(row.id), number: String(row.payment_number), customer: String(customer?.full_name ?? "Unknown"), amount: amount(row.amount), method: String(row.method), collectedAt: String(row.collected_at) };
  });
  return {
    invoices, payments, canManage: allowed(profile.role, permissions, ["Create", "Edit", "Manage"]),
    totals: {
      invoiced: invoices.reduce((sum, row) => sum + row.total, 0),
      collected: payments.reduce((sum, row) => sum + row.amount, 0),
      outstanding: invoices.reduce((sum, row) => sum + row.balance, 0),
      overdue: invoices.filter((row) => row.status === "overdue").reduce((sum, row) => sum + row.balance, 0),
      refunds: (refundsResult.data ?? []).reduce((sum, row) => sum + amount(row.amount), 0),
    },
  };
}
