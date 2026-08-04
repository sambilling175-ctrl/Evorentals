import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface CompanySettings {
  name: string;
  legalName: string;
  gstNumber: string;
  panNumber: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  email: string;
  phone: string;
  website: string;
}

export interface RentalSettings {
  defaultDeposit: number;
  lateFeePerHour: number;
  lateFeePerDay: number;
  minimumDuration: number;
  maximumDuration: number;
  gracePeriod: number;
  cancellationCharge: number;
  refundDays: number;
  taxPercentage: number;
  dynamicPricingEnabled: boolean;
}

export interface PaymentSettings {
  invoicePrefix: string;
  partialPaymentsEnabled: boolean;
  refundApprovalEnabled: boolean;
  autoReceiptEnabled: boolean;
  gstEnabled: boolean;
}

export interface SystemPreferences {
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
  currency: string;
  distanceUnit: string;
}

export interface SettingsOverview {
  canManage: boolean;
  company: CompanySettings;
  rental: RentalSettings;
  payment: PaymentSettings;
  preferences: SystemPreferences;
}

async function getSettingsActor(requireAdmin = false) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,company_id,role,status")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (profileError || !profile || profile.status !== "active") {
    throw new Error("Active employee profile required");
  }
  const canManage = profile.role === "admin" || profile.role === "super_admin";
  if (requireAdmin && !canManage) throw new Error("Administrator access required");
  return { supabase, user, profile, canManage };
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getSettingsOverview(): Promise<SettingsOverview> {
  const { supabase, profile, canManage } = await getSettingsActor();
  const companyId = profile.company_id;
  const [companyResult, rentalResult, paymentResult, preferencesResult] = await Promise.all([
    supabase.from("companies").select("name").eq("id", companyId).single(),
    supabase.from("rental_settings").select("default_deposit,late_fee_per_hour,late_fee_per_day,min_duration,max_duration,grace_period,cancellation_charges,refund_days,tax_percentage,dynamic_pricing_enabled").eq("company_id", companyId).single(),
    supabase.from("payment_settings").select("invoice_prefix,partial_payments_enabled,refund_approval_enabled,auto_receipt_enabled,gst_enabled").eq("company_id", companyId).single(),
    supabase.from("system_preferences").select("timezone,date_format,time_format,language,currency,distance_unit").eq("company_id", companyId).single(),
  ]);
  const { data: companyDetails, error: detailsError } = await supabase
    .from("company_settings")
    .select("company_name,business_name,gst_number,pan_number,address,city,state,pin_code,email,phone,website")
    .eq("company_id", companyId)
    .single();

  const firstError = companyResult.error ?? detailsError ?? rentalResult.error ?? paymentResult.error ?? preferencesResult.error;
  if (firstError) throw new Error(`Unable to load settings: ${firstError.message}`);
  if (!companyResult.data || !companyDetails || !rentalResult.data || !paymentResult.data || !preferencesResult.data) {
    throw new Error("Settings are incomplete for this company");
  }

  const rental = rentalResult.data;
  const payment = paymentResult.data;
  const preferences = preferencesResult.data;
  return {
    canManage,
    company: {
      name: companyDetails.company_name ?? companyResult.data.name,
      legalName: companyDetails.business_name ?? "",
      gstNumber: companyDetails.gst_number ?? "",
      panNumber: companyDetails.pan_number ?? "",
      address: companyDetails.address ?? "",
      city: companyDetails.city ?? "",
      state: companyDetails.state ?? "",
      pinCode: companyDetails.pin_code ?? "",
      email: companyDetails.email ?? "",
      phone: companyDetails.phone ?? "",
      website: companyDetails.website ?? "",
    },
    rental: {
      defaultDeposit: numberValue(rental.default_deposit),
      lateFeePerHour: numberValue(rental.late_fee_per_hour),
      lateFeePerDay: numberValue(rental.late_fee_per_day),
      minimumDuration: numberValue(rental.min_duration),
      maximumDuration: numberValue(rental.max_duration),
      gracePeriod: numberValue(rental.grace_period),
      cancellationCharge: numberValue(rental.cancellation_charges),
      refundDays: numberValue(rental.refund_days),
      taxPercentage: numberValue(rental.tax_percentage),
      dynamicPricingEnabled: rental.dynamic_pricing_enabled ?? false,
    },
    payment: {
      invoicePrefix: payment.invoice_prefix ?? "INV-",
      partialPaymentsEnabled: payment.partial_payments_enabled ?? false,
      refundApprovalEnabled: payment.refund_approval_enabled ?? true,
      autoReceiptEnabled: payment.auto_receipt_enabled ?? true,
      gstEnabled: payment.gst_enabled ?? true,
    },
    preferences: {
      timezone: preferences.timezone ?? "Asia/Kolkata",
      dateFormat: preferences.date_format ?? "DD-MM-YYYY",
      timeFormat: preferences.time_format ?? "hh:mm A",
      language: preferences.language ?? "en-IN",
      currency: preferences.currency ?? "INR",
      distanceUnit: preferences.distance_unit ?? "KM",
    },
  };
}

export async function saveCompanySettings(values: CompanySettings) {
  const { supabase, user, profile } = await getSettingsActor(true);
  const updatedAt = new Date().toISOString();
  const [companyResult, detailsResult] = await Promise.all([
    supabase.from("companies").update({ name: values.name, updated_at: updatedAt }).eq("id", profile.company_id).select("id").single(),
    supabase.from("company_settings").update({
      company_name: values.name,
      business_name: values.legalName || null,
      gst_number: values.gstNumber || null,
      pan_number: values.panNumber || null,
      address: values.address || null,
      city: values.city || null,
      state: values.state || null,
      country: "India",
      pin_code: values.pinCode || null,
      email: values.email || null,
      phone: values.phone || null,
      website: values.website || null,
      updated_by: user.id,
      updated_at: updatedAt,
    }).eq("company_id", profile.company_id).select("id").single(),
  ]);
  const error = companyResult.error ?? detailsResult.error;
  if (error) throw new Error(error.message);
}

export async function saveRentalSettings(values: RentalSettings) {
  const { supabase, user, profile } = await getSettingsActor(true);
  const { error } = await supabase.from("rental_settings").update({
    default_deposit: values.defaultDeposit,
    late_fee_per_hour: values.lateFeePerHour,
    late_fee_per_day: values.lateFeePerDay,
    min_duration: values.minimumDuration,
    max_duration: values.maximumDuration,
    grace_period: values.gracePeriod,
    cancellation_charges: values.cancellationCharge,
    refund_days: values.refundDays,
    tax_percentage: values.taxPercentage,
    dynamic_pricing_enabled: values.dynamicPricingEnabled,
    currency: "INR",
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }).eq("company_id", profile.company_id).select("id").single();
  if (error) throw new Error(error.message);
}

export async function savePaymentSettings(values: PaymentSettings) {
  const { supabase, user, profile } = await getSettingsActor(true);
  const { error } = await supabase.from("payment_settings").update({
    invoice_prefix: values.invoicePrefix,
    partial_payments_enabled: values.partialPaymentsEnabled,
    refund_approval_enabled: values.refundApprovalEnabled,
    auto_receipt_enabled: values.autoReceiptEnabled,
    gst_enabled: values.gstEnabled,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }).eq("company_id", profile.company_id).select("id").single();
  if (error) throw new Error(error.message);
}

export async function saveSystemPreferences(values: SystemPreferences) {
  const { supabase, user, profile } = await getSettingsActor(true);
  const { error } = await supabase.from("system_preferences").update({
    timezone: values.timezone,
    date_format: values.dateFormat,
    time_format: values.timeFormat,
    language: values.language,
    currency: values.currency,
    distance_unit: values.distanceUnit,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }).eq("company_id", profile.company_id).select("id").single();
  if (error) throw new Error(error.message);
}
