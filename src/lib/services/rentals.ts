import "server-only";

import { createClient } from "@/lib/supabase/server";

type Permissions = Record<string, string[]>;

export interface ActivatableBooking {
  id: string;
  number: string;
  customer: string;
  vehicle: string;
  startsAt: string;
  endsAt: string;
  currentOdometer: number;
  total: number;
}

export interface RentalRecord {
  id: string;
  bikeId: string;
  number: string;
  customer: string;
  vehicle: string;
  startedAt: string;
  plannedEndAt: string;
  startOdometer: number;
  currentOdometer: number;
  currentBatteryLevel: number;
  status: string;
  contractAmount: number;
  extensionAmount: number;
  total: number;
}

export interface ReplacementVehicle {
  id: string;
  label: string;
  currentOdometer: number;
  batteryLevel: number;
}

export interface RentalWorkspaceData {
  rentals: RentalRecord[];
  confirmedBookings: ActivatableBooking[];
  replacementVehicles: ReplacementVehicle[];
  canActivate: boolean;
  canExtend: boolean;
  canSwap: boolean;
  canReturn: boolean;
  totals: { active: number; dueToday: number; overdue: number; confirmed: number; returned: number };
}

function permissionsFrom(value: unknown): Permissions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, v]) => Array.isArray(v))) as Permissions;
}

function allowed(role: string, permissions: Permissions, actions: string[]) {
  if (role === "admin" || role === "super_admin") return true;
  const available = Object.entries(permissions).find(([key]) => key.toLowerCase() === "rentals")?.[1] ?? [];
  return available.some((value) => actions.some((action) => value.toLowerCase() === action.toLowerCase()));
}

async function actor() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,company_id,role,status")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (profileError || !profile || profile.status !== "active") throw new Error("Active employee profile required");
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("permissions")
    .eq("company_id", profile.company_id)
    .eq("name", profile.role)
    .is("deleted_at", null)
    .maybeSingle();
  if (roleError) throw new Error(roleError.message);
  return { supabase, profile, permissions: permissionsFrom(role?.permissions) };
}

const money = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

export async function getRentalWorkspace(): Promise<RentalWorkspaceData> {
  const a = await actor();
  if (!allowed(a.profile.role, a.permissions, ["View", "Create", "Edit", "Manage"])) {
    throw new Error("You do not have permission to view rentals");
  }
  const [rentalsResult, bookingsResult, fleetResult] = await Promise.all([
    a.supabase.from("rentals").select("id,bike_id,rental_number,started_at,planned_end_at,start_odometer,status,contract_amount,extension_amount,total_amount,customers!rentals_customer_id_fkey(full_name),bikes!rentals_bike_id_fkey(serial_number,model,current_odometer,battery_level)").eq("company_id", a.profile.company_id).is("deleted_at", null).order("created_at", { ascending: false }),
    a.supabase.from("bookings").select("id,booking_number,starts_at,ends_at,total_amount,customers!bookings_customer_id_fkey(full_name),bikes!bookings_bike_id_fkey(serial_number,model,current_odometer)").eq("company_id", a.profile.company_id).eq("status", "confirmed").is("deleted_at", null).order("starts_at"),
    a.supabase.from("bikes").select("id,serial_number,model,current_odometer,battery_level").eq("company_id", a.profile.company_id).eq("status", "available").is("deleted_at", null).order("serial_number"),
  ]);
  const error = rentalsResult.error ?? bookingsResult.error ?? fleetResult.error;
  if (error) throw new Error(`Unable to load rentals: ${error.message}`);

  const rentals = ((rentalsResult.data ?? []) as unknown as Record<string, unknown>[]).map((row) => {
    const customer = row.customers as Record<string, unknown> | null;
    const bike = row.bikes as Record<string, unknown> | null;
    return {
      id: String(row.id), bikeId: String(row.bike_id), number: String(row.rental_number ?? "Legacy rental"),
      customer: String(customer?.full_name ?? "Unknown"), vehicle: `${String(bike?.serial_number ?? "")} - ${String(bike?.model ?? "")}`,
      startedAt: String(row.started_at), plannedEndAt: String(row.planned_end_at ?? ""),
      startOdometer: money(row.start_odometer), currentOdometer: money(bike?.current_odometer),
      currentBatteryLevel: money(bike?.battery_level), status: String(row.status),
      contractAmount: money(row.contract_amount), extensionAmount: money(row.extension_amount), total: money(row.total_amount),
    };
  });
  const confirmedBookings = ((bookingsResult.data ?? []) as unknown as Record<string, unknown>[]).map((row) => {
    const customer = row.customers as Record<string, unknown> | null;
    const bike = row.bikes as Record<string, unknown> | null;
    return {
      id: String(row.id), number: String(row.booking_number), customer: String(customer?.full_name ?? "Unknown"),
      vehicle: `${String(bike?.serial_number ?? "")} - ${String(bike?.model ?? "")}`, startsAt: String(row.starts_at), endsAt: String(row.ends_at),
      currentOdometer: money(bike?.current_odometer), total: money(row.total_amount),
    };
  });
  const openBikeIds = new Set(rentals.filter((rental) => rental.status === "active" || rental.status === "overdue").map((rental) => rental.bikeId));
  const replacementVehicles = ((fleetResult.data ?? []) as unknown as Record<string, unknown>[])
    .filter((row) => !openBikeIds.has(String(row.id)))
    .map((row) => ({ id: String(row.id), label: `${String(row.serial_number)} - ${String(row.model)}`, currentOdometer: money(row.current_odometer), batteryLevel: money(row.battery_level) }));
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return {
    rentals, confirmedBookings, replacementVehicles,
    canActivate: allowed(a.profile.role, a.permissions, ["Create", "Edit", "Manage"]),
    canExtend: allowed(a.profile.role, a.permissions, ["Edit", "Manage"]),
    canSwap: allowed(a.profile.role, a.permissions, ["Edit", "Manage"]),
    canReturn: allowed(a.profile.role, a.permissions, ["Edit", "Manage"]),
    totals: {
      active: rentals.filter((rental) => rental.status === "active").length,
      dueToday: rentals.filter((rental) => rental.status === "active" && rental.plannedEndAt && new Date(rental.plannedEndAt) <= end && new Date(rental.plannedEndAt) >= now).length,
      overdue: rentals.filter((rental) => rental.status === "overdue" || (rental.status === "active" && rental.plannedEndAt && new Date(rental.plannedEndAt) < now)).length,
      confirmed: confirmedBookings.length,
      returned: rentals.filter((rental) => rental.status === "returned").length,
    },
  };
}

export async function activateBooking(input: { bookingId: string; startedAt: string; startOdometer: number }) {
  const a = await actor();
  if (!allowed(a.profile.role, a.permissions, ["Create", "Edit", "Manage"])) throw new Error("You do not have permission to activate rentals");
  const { data, error } = await a.supabase.rpc("activate_confirmed_booking", { p_booking_id: input.bookingId, p_started_at: input.startedAt, p_start_odometer: input.startOdometer });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error("Rental activation did not return a contract");
  return { rentalId: String(result.rental_id), rentalNumber: String(result.rental_number) };
}

export async function extendRental(input: { rentalId: string; extendedEndAt: string; reason?: string }) {
  const a = await actor();
  if (!allowed(a.profile.role, a.permissions, ["Edit", "Manage"])) throw new Error("You do not have permission to extend rentals");
  const { data, error } = await a.supabase.rpc("extend_active_rental", { p_rental_id: input.rentalId, p_extended_end_at: input.extendedEndAt, p_reason: input.reason || null });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error("Rental extension did not return a result");
  return { rentalNumber: String(result.rental_number), extensionAmount: money(result.extension_amount), newTotal: money(result.new_total) };
}

export async function swapRentalVehicle(input: { rentalId: string; toBikeId: string; swappedAt: string; fromReturnOdometer: number; toStartOdometer: number; returnedVehicleStatus: "available" | "maintenance"; reason: string }) {
  const a = await actor();
  if (!allowed(a.profile.role, a.permissions, ["Edit", "Manage"])) throw new Error("You do not have permission to swap rental vehicles");
  const { data, error } = await a.supabase.rpc("swap_rental_vehicle", { p_rental_id: input.rentalId, p_to_bike_id: input.toBikeId, p_swapped_at: input.swappedAt, p_from_return_odometer: input.fromReturnOdometer, p_to_start_odometer: input.toStartOdometer, p_returned_vehicle_status: input.returnedVehicleStatus, p_reason: input.reason });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error("Vehicle swap did not return a result");
  return { rentalNumber: String(result.rental_number) };
}

export interface DamageItemInput { description: string; amount: number; evidenceMetadata: unknown[] }
export interface ReturnInspectionInput {
  rentalId: string;
  returnedAt: string;
  returnOdometer: number;
  batteryLevel: number;
  condition: "excellent" | "good" | "fair" | "damaged";
  checklist: Record<string, boolean>;
  notes?: string;
  vehicleDisposition: "available" | "maintenance";
  damageItems: DamageItemInput[];
  evidenceMetadata: unknown[];
}

export async function recordRentalReturn(input: ReturnInspectionInput) {
  const a = await actor();
  if (!allowed(a.profile.role, a.permissions, ["Edit", "Manage"])) throw new Error("You do not have permission to record rental returns");
  const { data, error } = await a.supabase.rpc("record_rental_return", {
    p_rental_id: input.rentalId, p_returned_at: input.returnedAt, p_return_odometer: input.returnOdometer,
    p_battery_level: input.batteryLevel, p_condition: input.condition, p_checklist: input.checklist,
    p_notes: input.notes || null, p_vehicle_disposition: input.vehicleDisposition, p_damage_items: input.damageItems,
    p_evidence_metadata: input.evidenceMetadata,
  });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error("Return inspection did not return a result");
  return { rentalNumber: String(result.rental_number), damageTotal: money(result.damage_total), vehicleStatus: String(result.vehicle_status) };
}
