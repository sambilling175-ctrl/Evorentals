"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { calculatePricingQuote, createPricingPlan, updatePricingPlan, type PricingQuote } from "@/lib/services/pricing";

export interface PricingActionState { status: "idle" | "success" | "error"; message: string }
export const initialPricingActionState: PricingActionState = { status: "idle", message: "" };
export interface QuoteActionState extends PricingActionState { quote?: PricingQuote }
export const initialQuoteActionState: QuoteActionState = { status: "idle", message: "" };

const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());
const nullableInteger = z.preprocess((value) => value === "" || value == null ? null : value, z.coerce.number().int().min(1).max(3650).nullable());
const planSchema = z.object({
  code: z.string().trim().toUpperCase().min(2).max(24).regex(/^[A-Z0-9_-]+$/, "Use uppercase letters, numbers, underscore, or hyphen"),
  name: z.string().trim().min(2).max(100), description: z.string().trim().max(500), vehicleCategory: z.string().trim().max(100),
  billingUnit: z.enum(["day", "week", "month"]), baseRate: z.coerce.number().min(0).max(1_000_000),
  includedKm: z.coerce.number().min(0).max(1_000_000), extraKmRate: z.coerce.number().min(0).max(100_000),
  depositAmount: z.coerce.number().min(0).max(1_000_000), minimumDays: z.coerce.number().int().min(1).max(3650), maximumDays: nullableInteger,
  taxInclusive: checkbox, status: z.enum(["active", "inactive"]), effectiveFrom: z.iso.date(), effectiveTo: z.string().trim().refine((value) => !value || z.iso.date().safeParse(value).success, "Enter a valid end date"),
}).refine((value) => !value.maximumDays || value.maximumDays >= value.minimumDays, { message: "Maximum days must be at least minimum days" })
  .refine((value) => !value.effectiveTo || value.effectiveTo >= value.effectiveFrom, { message: "End date must not be before start date" });

async function savePlan(formData: FormData, id?: string): Promise<PricingActionState> {
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the plan details" };
  try {
    if (id) await updatePricingPlan(id, parsed.data); else await createPricingPlan(parsed.data);
    revalidatePath("/pricing");
    return { status: "success", message: id ? "Pricing plan saved" : "Pricing plan created" };
  } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Unable to save pricing plan" }; }
}

export async function addPricingPlan(_state: PricingActionState, formData: FormData) { return savePlan(formData); }
export async function editPricingPlan(id: string, _state: PricingActionState, formData: FormData) { return savePlan(formData, id); }

const quoteSchema = z.object({ planId: z.string().uuid(), durationDays: z.coerce.number().int().min(1).max(3650), estimatedKm: z.coerce.number().min(0).max(1_000_000) });
export async function previewPricingQuote(_state: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  const parsed = quoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the quote inputs" };
  try { return { status: "success", message: "Quote calculated from the live pricing plan", quote: await calculatePricingQuote(parsed.data) }; }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Unable to calculate quote" }; }
}
