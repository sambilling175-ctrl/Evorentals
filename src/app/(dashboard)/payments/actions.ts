"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { issueRentalInvoice, postPayment, refundDeposit } from "@/lib/services/receivables";

export interface ReceivableActionState { status: "idle" | "success" | "error"; message: string }
export const initialReceivableActionState: ReceivableActionState = { status: "idle", message: "" };

const localDateTime = z.string().trim().min(1).refine((value) => !Number.isNaN(new Date(`${value}:00+05:30`).getTime()), "Enter a valid date and time");
const method = z.enum(["cash", "upi", "card", "bank_transfer", "other"]);
const timestamp = (value: string) => new Date(`${value}:00+05:30`).toISOString();

const invoiceSchema = z.object({ rentalId: z.uuid(), dueAt: localDateTime, notes: z.string().trim().max(2000).optional() });
const paymentSchema = z.object({
  customerId: z.uuid(), amount: z.coerce.number().positive().finite(), method, reference: z.string().trim().max(200).optional(),
  collectedAt: localDateTime, allocations: z.string().default("[]").transform((value, context) => {
    try {
      const parsed = z.array(z.object({ invoiceId: z.uuid(), amount: z.coerce.number().positive().finite() })).safeParse(JSON.parse(value));
      if (!parsed.success) { context.addIssue({ code: "custom", message: "Payment allocations are invalid" }); return z.NEVER; }
      return parsed.data;
    } catch { context.addIssue({ code: "custom", message: "Payment allocations must be valid JSON" }); return z.NEVER; }
  }),
  notes: z.string().trim().max(2000).optional(),
});
const refundSchema = z.object({ rentalId: z.uuid(), amount: z.coerce.number().positive().finite(), method, reference: z.string().trim().max(200).optional(), refundedAt: localDateTime, reason: z.string().trim().min(3).max(1000) });

function failure(error: unknown): ReceivableActionState { return { status: "error", message: error instanceof Error ? error.message : "Unable to update collections" }; }

export async function issueInvoiceAction(_: ReceivableActionState, formData: FormData): Promise<ReceivableActionState> {
  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check invoice details" };
  try { const result = await issueRentalInvoice({ ...parsed.data, dueAt: timestamp(parsed.data.dueAt) }); revalidatePath("/payments"); return { status: "success", message: `${result.number} issued · ₹${result.total.toLocaleString("en-IN")}` }; } catch (error) { return failure(error); }
}

export async function postPaymentAction(_: ReceivableActionState, formData: FormData): Promise<ReceivableActionState> {
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check payment details" };
  try { const result = await postPayment({ ...parsed.data, collectedAt: timestamp(parsed.data.collectedAt) }); revalidatePath("/payments"); return { status: "success", message: `${result.number} posted · ₹${parsed.data.amount.toLocaleString("en-IN")}` }; } catch (error) { return failure(error); }
}

export async function refundDepositAction(_: ReceivableActionState, formData: FormData): Promise<ReceivableActionState> {
  const parsed = refundSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check refund details" };
  try { const result = await refundDeposit({ ...parsed.data, refundedAt: timestamp(parsed.data.refundedAt) }); revalidatePath("/payments"); return { status: "success", message: `${result.number} posted` }; } catch (error) { return failure(error); }
}
