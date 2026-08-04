import "server-only";

import { createClient } from "@/lib/supabase/server";

type PermissionMap = Record<string, string[]>;
export type BillingUnit = "day" | "week" | "month";
export type PricingStatus = "active" | "inactive";

export interface PricingPlan {
  id: string; code: string; name: string; description: string; vehicleCategory: string;
  billingUnit: BillingUnit; baseRate: number; includedKm: number; extraKmRate: number;
  depositAmount: number; minimumDays: number; maximumDays: number | null;
  taxInclusive: boolean; status: PricingStatus; effectiveFrom: string; effectiveTo: string; updatedAt: string;
}

export interface PricingWorkspaceData {
  plans: PricingPlan[]; canManage: boolean; taxPercentage: number;
  totals: { all: number; active: number; daily: number; weekly: number; monthly: number };
}

export type PricingPlanInput = Omit<PricingPlan, "id" | "updatedAt">;
export interface QuoteInput { planId: string; durationDays: number; estimatedKm: number }
export interface PricingQuote {
  planName: string; durationDays: number; billingUnits: number; rentalAmount: number;
  includedKm: number; excessKm: number; excessKmCharge: number; taxPercentage: number;
  taxAmount: number; depositAmount: number; totalPayable: number;
}

function permissionsFrom(value: unknown): PermissionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, actions]) => Array.isArray(actions))) as PermissionMap;
}

function hasPermission(role: string, permissions: PermissionMap, accepted: string[]) {
  if (role === "admin" || role === "super_admin") return true;
  const actions = Object.entries(permissions).find(([name]) => name.toLowerCase() === "rentals")?.[1] ?? [];
  return actions.some((action) => accepted.some((allowed) => action.toLowerCase() === allowed.toLowerCase()));
}

async function getActor() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");
  const { data: profile, error } = await supabase.from("profiles").select("id,company_id,role,status").eq("id", user.id).is("deleted_at", null).maybeSingle();
  if (error || !profile || profile.status !== "active") throw new Error("Active employee profile required");
  const { data: role } = await supabase.from("roles").select("permissions").eq("company_id", profile.company_id).eq("name", profile.role).is("deleted_at", null).maybeSingle();
  return { supabase, user, profile, permissions: permissionsFrom(role?.permissions) };
}

function amount(value: unknown) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0; }
function roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function indiaDate() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
function mapPlan(row: Record<string, unknown>): PricingPlan {
  return {
    id: String(row.id), code: String(row.code), name: String(row.name), description: String(row.description ?? ""),
    vehicleCategory: String(row.vehicle_category ?? ""), billingUnit: row.billing_unit as BillingUnit,
    baseRate: amount(row.base_rate), includedKm: amount(row.included_km), extraKmRate: amount(row.extra_km_rate),
    depositAmount: amount(row.deposit_amount), minimumDays: amount(row.minimum_days), maximumDays: row.maximum_days == null ? null : amount(row.maximum_days),
    taxInclusive: Boolean(row.tax_inclusive), status: row.status as PricingStatus, effectiveFrom: String(row.effective_from),
    effectiveTo: String(row.effective_to ?? ""), updatedAt: String(row.updated_at ?? ""),
  };
}

const planColumns = "id,code,name,description,vehicle_category,billing_unit,base_rate,included_km,extra_km_rate,deposit_amount,minimum_days,maximum_days,tax_inclusive,status,effective_from,effective_to,updated_at";

export async function getPricingWorkspace(): Promise<PricingWorkspaceData> {
  const actor = await getActor();
  if (!hasPermission(actor.profile.role, actor.permissions, ["View", "Create", "Edit", "Manage"])) throw new Error("You do not have permission to view pricing");
  const [plansResult, settingsResult] = await Promise.all([
    actor.supabase.from("pricing_plans").select(planColumns).eq("company_id", actor.profile.company_id).is("deleted_at", null).order("name"),
    actor.supabase.from("rental_settings").select("tax_percentage").eq("company_id", actor.profile.company_id).single(),
  ]);
  const firstError = plansResult.error ?? settingsResult.error;
  if (firstError) throw new Error(`Unable to load pricing: ${firstError.message}`);
  const plans = (plansResult.data ?? []).map((row) => mapPlan(row as Record<string, unknown>));
  return { plans, canManage: hasPermission(actor.profile.role, actor.permissions, ["Edit", "Manage"]), taxPercentage: amount(settingsResult.data?.tax_percentage), totals: {
    all: plans.length, active: plans.filter((plan) => plan.status === "active").length,
    daily: plans.filter((plan) => plan.billingUnit === "day").length, weekly: plans.filter((plan) => plan.billingUnit === "week").length,
    monthly: plans.filter((plan) => plan.billingUnit === "month").length,
  }};
}

function dbValues(values: PricingPlanInput) { return {
  code: values.code, name: values.name, description: values.description || null, vehicle_category: values.vehicleCategory || null,
  billing_unit: values.billingUnit, base_rate: values.baseRate, included_km: values.includedKm, extra_km_rate: values.extraKmRate,
  deposit_amount: values.depositAmount, minimum_days: values.minimumDays, maximum_days: values.maximumDays,
  tax_inclusive: values.taxInclusive, status: values.status, effective_from: values.effectiveFrom, effective_to: values.effectiveTo || null,
}; }

export async function createPricingPlan(values: PricingPlanInput) {
  const actor = await getActor();
  if (!hasPermission(actor.profile.role, actor.permissions, ["Edit", "Manage"])) throw new Error("You do not have permission to manage pricing");
  const { error } = await actor.supabase.from("pricing_plans").insert({ ...dbValues(values), company_id: actor.profile.company_id, created_by: actor.user.id, updated_by: actor.user.id }).select("id").single();
  if (error) throw new Error(error.message);
}

export async function updatePricingPlan(id: string, values: PricingPlanInput) {
  const actor = await getActor();
  if (!hasPermission(actor.profile.role, actor.permissions, ["Edit", "Manage"])) throw new Error("You do not have permission to manage pricing");
  const { data, error } = await actor.supabase.from("pricing_plans").update({ ...dbValues(values), updated_by: actor.user.id, updated_at: new Date().toISOString() }).eq("id", id).eq("company_id", actor.profile.company_id).is("deleted_at", null).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Pricing plan not found or you do not have access");
}

export async function calculatePricingQuote(input: QuoteInput): Promise<PricingQuote> {
  const actor = await getActor();
  if (!hasPermission(actor.profile.role, actor.permissions, ["View", "Create", "Edit", "Manage"])) throw new Error("You do not have permission to quote pricing");
  const [planResult, settingsResult] = await Promise.all([
    actor.supabase.from("pricing_plans").select(planColumns).eq("id", input.planId).eq("company_id", actor.profile.company_id).eq("status", "active").is("deleted_at", null).single(),
    actor.supabase.from("rental_settings").select("tax_percentage").eq("company_id", actor.profile.company_id).single(),
  ]);
  const firstError = planResult.error ?? settingsResult.error;
  if (firstError || !planResult.data) throw new Error(firstError?.message ?? "Pricing plan unavailable");
  const plan = mapPlan(planResult.data as Record<string, unknown>);
  const today = indiaDate();
  if (plan.effectiveFrom > today || (plan.effectiveTo && plan.effectiveTo < today)) throw new Error("This pricing plan is outside its effective date range");
  if (input.durationDays < plan.minimumDays || (plan.maximumDays && input.durationDays > plan.maximumDays)) throw new Error(`Duration must be between ${plan.minimumDays} and ${plan.maximumDays ?? "the plan maximum"} days`);
  const unitDays = plan.billingUnit === "day" ? 1 : plan.billingUnit === "week" ? 7 : 30;
  const billingUnits = Math.ceil(input.durationDays / unitDays);
  const rentalAmount = roundMoney(billingUnits * plan.baseRate);
  const excessKm = Math.max(0, input.estimatedKm - plan.includedKm * billingUnits);
  const excessKmCharge = roundMoney(excessKm * plan.extraKmRate);
  const taxable = rentalAmount + excessKmCharge;
  const taxPercentage = amount(settingsResult.data?.tax_percentage);
  const taxAmount = plan.taxInclusive ? roundMoney(taxable * taxPercentage / (100 + taxPercentage)) : roundMoney(taxable * taxPercentage / 100);
  const taxToAdd = plan.taxInclusive ? 0 : taxAmount;
  return { planName: plan.name, durationDays: input.durationDays, billingUnits, rentalAmount, includedKm: plan.includedKm * billingUnits, excessKm, excessKmCharge, taxPercentage, taxAmount, depositAmount: plan.depositAmount, totalPayable: roundMoney(taxable + taxToAdd + plan.depositAmount) };
}
