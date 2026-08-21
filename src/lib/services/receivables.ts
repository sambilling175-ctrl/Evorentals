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

export interface ReturnedRentalCollection {
  rentalId: string;
  rentalNumber: string;
  customer: string;
  invoiceId: string;
  invoiceNumber: string;
  balance: number;
  lines: Array<{ id: string; type: string; description: string; amount: number; allocated: number; balance: number }>;
}

export interface ReceivableReceipt {
  id: string;
  number: string;
  paymentNumber: string;
  rental: string;
  customer: string;
  amount: number;
  method: string;
  issuedAt: string;
  allocations: Array<{ lineType: string; description: string; amount: number }>;
}

export interface ReceivablesWorkspaceData {
  invoices: ReceivableInvoice[];
  payments: ReceivablePayment[];
  customers: ReceivableOption[];
  returnedRentals: ReceivableOption[];
  invoiceableRentals: ReceivableOption[];
  collectionRentals: ReturnedRentalCollection[];
  receipts: ReceivableReceipt[];
  canManage: boolean;
  totals: { invoiced: number; collected: number; outstanding: number; overdue: number; refunds: number };
}

export interface ReceivableOption { id: string; label: string }

type Actor = Awaited<ReturnType<typeof getActor>>;

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

async function getActor() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("company_id,role,status").eq("id", user.id).is("deleted_at", null).maybeSingle();
  if (profileError || !profile || profile.status !== "active") throw new Error("Active employee profile required");
  const { data: roleRow, error: roleError } = await supabase.from("roles")
    .select("permissions").eq("company_id", profile.company_id).eq("name", profile.role).is("deleted_at", null).maybeSingle();
  if (roleError) throw new Error(roleError.message);
  return { supabase, user, profile, permissions: permissionsFrom(roleRow?.permissions) };
}

function requireManage(actor: Actor, actions: string[]) {
  if (!allowed(actor.profile.role, actor.permissions, actions)) throw new Error("You do not have permission to manage collections");
}

function rpcResult<T>(data: T[] | T | null, message: string): T {
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error(message);
  return result;
}

export async function getReceivablesWorkspace(): Promise<ReceivablesWorkspaceData> {
  const { supabase, profile, permissions } = await getActor();
  if (!allowed(profile.role, permissions, ["View", "Create", "Edit", "Manage"])) throw new Error("You do not have permission to view collections");

  const [balancesResult, paymentsResult, allPaymentsResult, refundsResult, customersResult, rentalsResult, receiptsResult] = await Promise.all([
    supabase.from("receivable_invoice_balances")
      .select("invoice_id,customer_id,rental_id,invoice_number,issued_at,due_at,total_amount,allocated_amount,balance_due")
      .eq("company_id", profile.company_id).order("issued_at", { ascending: false }),
    supabase.from("receivable_payments")
      .select("id,payment_number,amount,method,collected_at,customer_id")
      .eq("company_id", profile.company_id).order("collected_at", { ascending: false }).limit(20),
    supabase.from("receivable_payments").select("amount").eq("company_id", profile.company_id),
    supabase.from("receivable_refunds").select("amount").eq("company_id", profile.company_id),
    supabase.from("customers").select("id,full_name,customer_number,status,deleted_at").eq("company_id", profile.company_id).order("full_name"),
    supabase.from("rentals").select("id,rental_number,customer_id").eq("company_id", profile.company_id).eq("status", "returned").is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("receivable_receipts").select("id,payment_id,rental_id,customer_id,receipt_number,issued_at,amount,method,allocation_snapshot").eq("company_id", profile.company_id).order("issued_at", { ascending: false }).limit(20),
  ]);
  const error = balancesResult.error ?? paymentsResult.error ?? allPaymentsResult.error ?? refundsResult.error ?? customersResult.error ?? rentalsResult.error ?? receiptsResult.error;
  if (error) throw new Error(`Unable to load collections: ${error.message}`);

  const balanceRows = (balancesResult.data ?? []) as unknown as Record<string, unknown>[];
  const customerIds = [...new Set(balanceRows.map((row) => String(row.customer_id)))];
  const rentalIds = [...new Set(balanceRows.map((row) => String(row.rental_id)))];
  const invoiceIds = balanceRows.map((row) => String(row.invoice_id));
  const receiptPaymentIds = (receiptsResult.data ?? []).map((row) => row.payment_id);
  const [invoiceCustomersResult, invoiceRentalsResult, linesResult, lineAllocationsResult, receiptPaymentsResult] = await Promise.all([
    customerIds.length ? supabase.from("customers").select("id,full_name").eq("company_id", profile.company_id).in("id", customerIds) : Promise.resolve({ data: [], error: null }),
    rentalIds.length ? supabase.from("rentals").select("id,rental_number").eq("company_id", profile.company_id).in("id", rentalIds) : Promise.resolve({ data: [], error: null }),
    invoiceIds.length ? supabase.from("receivable_invoice_lines").select("id,invoice_id,line_type,description,line_amount,created_at").eq("company_id", profile.company_id).in("invoice_id", invoiceIds).order("created_at") : Promise.resolve({ data: [], error: null }),
    invoiceIds.length ? supabase.from("receivable_payment_line_allocations").select("invoice_line_id,amount").eq("company_id", profile.company_id).in("invoice_id", invoiceIds) : Promise.resolve({ data: [], error: null }),
    receiptPaymentIds.length ? supabase.from("receivable_payments").select("id,payment_number").eq("company_id", profile.company_id).in("id", receiptPaymentIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const referenceError = invoiceCustomersResult.error ?? invoiceRentalsResult.error ?? linesResult.error ?? lineAllocationsResult.error ?? receiptPaymentsResult.error;
  if (referenceError) throw new Error(`Unable to load collection references: ${referenceError.message}`);
  const customerNames = new Map((invoiceCustomersResult.data ?? []).map((row) => [row.id, row.full_name]));
  for (const row of customersResult.data ?? []) customerNames.set(row.id, row.full_name);
  const rentalNumbers = new Map((invoiceRentalsResult.data ?? []).map((row) => [row.id, row.rental_number]));
  for (const row of rentalsResult.data ?? []) rentalNumbers.set(row.id, row.rental_number);
  const paymentNumbers = new Map((receiptPaymentsResult.data ?? []).map((row) => [row.id, row.payment_number]));
  const allocatedByLine = new Map<string, number>();
  for (const row of lineAllocationsResult.data ?? []) allocatedByLine.set(row.invoice_line_id, (allocatedByLine.get(row.invoice_line_id) ?? 0) + amount(row.amount));

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
    return { id: String(row.id), number: String(row.payment_number), customer: customerNames.get(String(row.customer_id)) ?? "Unknown", amount: amount(row.amount), method: String(row.method), collectedAt: String(row.collected_at) };
  });
  const linesByInvoice = new Map<string, ReturnedRentalCollection["lines"]>();
  for (const row of linesResult.data ?? []) {
    const allocated = allocatedByLine.get(row.id) ?? 0;
    const line = { id: row.id, type: row.line_type, description: row.description, amount: amount(row.line_amount), allocated, balance: Math.max(0, amount(row.line_amount) - allocated) };
    linesByInvoice.set(row.invoice_id, [...(linesByInvoice.get(row.invoice_id) ?? []), line]);
  }
  const returnedIds = new Set((rentalsResult.data ?? []).map((row) => row.id));
  const invoicedRentalIds = new Set(balanceRows.map((row) => String(row.rental_id)));
  const collectionRentals = balanceRows.filter((row) => returnedIds.has(String(row.rental_id)) && amount(row.balance_due) > 0).map((row) => ({
    rentalId: String(row.rental_id), rentalNumber: rentalNumbers.get(String(row.rental_id)) ?? "Unknown", customer: customerNames.get(String(row.customer_id)) ?? "Unknown",
    invoiceId: String(row.invoice_id), invoiceNumber: String(row.invoice_number), balance: amount(row.balance_due), lines: linesByInvoice.get(String(row.invoice_id)) ?? [],
  }));
  const receipts = (receiptsResult.data ?? []).map((row) => ({
    id: row.id, number: row.receipt_number, paymentNumber: paymentNumbers.get(row.payment_id) ?? "Unknown", rental: rentalNumbers.get(row.rental_id) ?? "Unknown",
    customer: customerNames.get(row.customer_id) ?? "Unknown", amount: amount(row.amount), method: row.method, issuedAt: row.issued_at,
    allocations: Array.isArray(row.allocation_snapshot) ? row.allocation_snapshot.map((item) => { const value = item as Record<string, unknown>; return { lineType: String(value.lineType), description: String(value.description), amount: amount(value.amount) }; }) : [],
  }));
  return {
    invoices, payments, collectionRentals, receipts,
    customers: (customersResult.data ?? []).filter((row) => row.status === "active" && row.deleted_at === null).map((row) => ({ id: row.id, label: `${row.full_name} · ${row.customer_number}` })),
    returnedRentals: (rentalsResult.data ?? []).map((row) => ({ id: row.id, label: `${row.rental_number} · ${customerNames.get(row.customer_id) ?? "Unknown"}` })),
    invoiceableRentals: (rentalsResult.data ?? []).filter((row) => !invoicedRentalIds.has(row.id)).map((row) => ({ id: row.id, label: `${row.rental_number} · ${customerNames.get(row.customer_id) ?? "Unknown"}` })),
    canManage: allowed(profile.role, permissions, ["Create", "Edit", "Manage"]),
    totals: {
      invoiced: invoices.reduce((sum, row) => sum + row.total, 0),
      collected: (allPaymentsResult.data ?? []).reduce((sum, row) => sum + amount(row.amount), 0),
      outstanding: invoices.reduce((sum, row) => sum + row.balance, 0),
      overdue: invoices.filter((row) => row.status === "overdue").reduce((sum, row) => sum + row.balance, 0),
      refunds: (refundsResult.data ?? []).reduce((sum, row) => sum + amount(row.amount), 0),
    },
  };
}

export async function issueRentalInvoice(input: { rentalId: string; dueAt: string; notes?: string }) {
  const actor = await getActor();
  requireManage(actor, ["Create", "Edit", "Manage"]);
  const { data, error } = await actor.supabase.rpc("issue_returned_rental_invoice", { p_rental_id: input.rentalId, p_due_at: input.dueAt, p_notes: input.notes || null });
  if (error) throw new Error(error.message);
  const result = rpcResult(data, "Invoice was not issued");
  return { number: String(result.invoice_number), total: amount(result.total_amount) };
}

export async function postPayment(input: { customerId: string; amount: number; method: string; reference?: string; collectedAt: string; allocations: Array<{ invoiceId: string; amount: number }>; notes?: string }) {
  const actor = await getActor();
  requireManage(actor, ["Create", "Edit", "Manage"]);
  const { data, error } = await actor.supabase.rpc("post_receivable_payment", {
    p_customer_id: input.customerId, p_amount: input.amount, p_method: input.method, p_reference: input.reference || null,
    p_collected_at: input.collectedAt, p_allocations: input.allocations, p_notes: input.notes || null,
  });
  if (error) throw new Error(error.message);
  const result = rpcResult(data, "Payment was not posted");
  return { number: String(result.payment_number), allocated: amount(result.allocated_amount) };
}

export async function postReturnedRentalCollection(input: { rentalId: string; method: string; reference?: string; collectedAt: string; allocations: Array<{ invoiceLineId: string; amount: number }>; notes?: string }) {
  const actor = await getActor();
  requireManage(actor, ["Create", "Edit", "Manage"]);
  const paymentAmount = input.allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  const { data, error } = await actor.supabase.rpc("post_returned_rental_collection", {
    p_rental_id: input.rentalId, p_amount: paymentAmount, p_method: input.method, p_reference: input.reference || null,
    p_collected_at: input.collectedAt, p_line_allocations: input.allocations, p_notes: input.notes || null,
  });
  if (error) throw new Error(error.message);
  const result = rpcResult(data, "Returned-rental collection was not posted");
  return { paymentNumber: String(result.payment_number), receiptNumber: String(result.receipt_number), amount: amount(result.allocated_amount) };
}

export async function refundDeposit(input: { rentalId: string; amount: number; method: string; reference?: string; refundedAt: string; reason: string }) {
  const actor = await getActor();
  requireManage(actor, ["Edit", "Manage"]);
  const { data, error } = await actor.supabase.rpc("post_deposit_refund", {
    p_rental_id: input.rentalId, p_amount: input.amount, p_method: input.method, p_reference: input.reference || null,
    p_refunded_at: input.refundedAt, p_reason: input.reason,
  });
  if (error) throw new Error(error.message);
  const result = rpcResult(data, "Deposit refund was not posted");
  return { number: String(result.refund_number) };
}
