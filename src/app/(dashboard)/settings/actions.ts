"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  saveCompanySettings,
  savePaymentSettings,
  saveRentalSettings,
  saveSystemPreferences,
} from "@/lib/services/settings";

export interface SettingsActionState {
  status: "idle" | "success" | "error";
  message: string;
}

export const initialSettingsActionState: SettingsActionState = { status: "idle", message: "" };

const optionalText = z.string().trim().max(160);
const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

const companySchema = z.object({
  name: z.string().trim().min(2).max(120),
  legalName: optionalText,
  gstNumber: z.string().trim().regex(/^$|^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, "Enter a valid GSTIN"),
  panNumber: z.string().trim().regex(/^$|^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN"),
  address: z.string().trim().max(240),
  city: z.string().trim().max(80),
  state: z.string().trim().max(80),
  pinCode: z.string().trim().regex(/^$|^\d{6}$/, "Enter a valid 6-digit PIN code"),
  email: z.string().trim().email().or(z.literal("")),
  phone: z.string().trim().regex(/^$|^[6-9]\d{9}$/, "Enter a valid Indian mobile number"),
  website: z.string().trim().url().or(z.literal("")),
});

const rentalSchema = z.object({
  defaultDeposit: z.coerce.number().min(0).max(1_000_000),
  lateFeePerHour: z.coerce.number().min(0).max(100_000),
  lateFeePerDay: z.coerce.number().min(0).max(1_000_000),
  minimumDuration: z.coerce.number().int().min(1).max(365),
  maximumDuration: z.coerce.number().int().min(1).max(3650),
  gracePeriod: z.coerce.number().int().min(0).max(1440),
  cancellationCharge: z.coerce.number().min(0).max(1_000_000),
  refundDays: z.coerce.number().int().min(0).max(90),
  taxPercentage: z.coerce.number().min(0).max(100),
  dynamicPricingEnabled: checkbox,
}).refine((value) => value.maximumDuration >= value.minimumDuration, {
  message: "Maximum duration must be at least the minimum duration",
});

const paymentSchema = z.object({
  invoicePrefix: z.string().trim().min(1).max(16).regex(/^[A-Z0-9/-]+$/, "Use uppercase letters, numbers, slash, or hyphen"),
  partialPaymentsEnabled: checkbox,
  refundApprovalEnabled: checkbox,
  autoReceiptEnabled: checkbox,
  gstEnabled: checkbox,
});

const preferencesSchema = z.object({
  timezone: z.literal("Asia/Kolkata"),
  dateFormat: z.enum(["DD-MM-YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]),
  timeFormat: z.enum(["hh:mm A", "HH:mm"]),
  language: z.literal("en-IN"),
  currency: z.literal("INR"),
  distanceUnit: z.literal("KM"),
});

async function runSettingsAction<T>(schema: z.ZodType<T>, formData: FormData, save: (values: T) => Promise<void>, successMessage: string): Promise<SettingsActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form values" };
  try {
    await save(parsed.data);
    revalidatePath("/settings");
    return { status: "success", message: successMessage };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to save settings" };
  }
}

export async function updateCompanySettings(_state: SettingsActionState, formData: FormData) {
  return runSettingsAction(companySchema, formData, saveCompanySettings, "Company profile saved");
}

export async function updateRentalSettings(_state: SettingsActionState, formData: FormData) {
  return runSettingsAction(rentalSchema, formData, saveRentalSettings, "Rental rules saved");
}

export async function updatePaymentSettings(_state: SettingsActionState, formData: FormData) {
  return runSettingsAction(paymentSchema, formData, savePaymentSettings, "Payment controls saved");
}

export async function updateSystemPreferences(_state: SettingsActionState, formData: FormData) {
  return runSettingsAction(preferencesSchema, formData, saveSystemPreferences, "Regional preferences saved");
}
