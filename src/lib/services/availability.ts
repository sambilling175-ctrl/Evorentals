import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AvailabilityContext {
  supabase: SupabaseClient;
  companyId: string;
}

export interface AvailabilityWindow {
  startsAt: string;
  endsAt: string;
}

export interface AvailableVehicle {
  id: string;
  serialNumber: string;
  model: string;
  category: string;
  batteryLevel: number;
}

function assertWindow(window: AvailabilityWindow) {
  const startsAt = new Date(window.startsAt).getTime();
  const endsAt = new Date(window.endsAt).getTime();
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) {
    throw new Error("Availability window must have valid, increasing timestamps");
  }
}

/**
 * The authoritative read seam for booking availability. The database exclusion
 * constraint remains the write-time race guard; this module keeps every UI
 * projection on the same company, rental, and overlap facts.
 */
export async function listAvailableVehicles(
  context: AvailabilityContext,
  window: AvailabilityWindow,
): Promise<AvailableVehicle[]> {
  assertWindow(window);
  const { supabase, companyId } = context;
  const [bikesResult, rentalsResult, bookingsResult] = await Promise.all([
    supabase.from("bikes")
      .select("id,serial_number,model,category,battery_level")
      .eq("company_id", companyId).eq("status", "available").is("deleted_at", null)
      .order("serial_number"),
    supabase.from("rentals").select("bike_id")
      .eq("company_id", companyId).in("status", ["active", "overdue"]).is("deleted_at", null),
    supabase.from("bookings").select("bike_id")
      .eq("company_id", companyId).in("status", ["pending", "confirmed"])
      .is("deleted_at", null).lt("starts_at", window.endsAt).gt("ends_at", window.startsAt),
  ]);
  const error = bikesResult.error ?? rentalsResult.error ?? bookingsResult.error;
  if (error) throw new Error(`Unable to resolve vehicle availability: ${error.message}`);

  const occupied = new Set([
    ...(rentalsResult.data ?? []).map((row) => row.bike_id),
    ...(bookingsResult.data ?? []).map((row) => row.bike_id),
  ]);
  return (bikesResult.data ?? [])
    .filter((bike) => !occupied.has(bike.id))
    .map((bike) => ({
      id: bike.id,
      serialNumber: bike.serial_number ?? "Not assigned",
      model: bike.model ?? "Unknown model",
      category: bike.category ?? "",
      batteryLevel: bike.battery_level ?? 100,
    }));
}

export async function assertVehicleAvailable(
  context: AvailabilityContext,
  window: AvailabilityWindow,
  bikeId: string,
) {
  const available = await listAvailableVehicles(context, window);
  if (!available.some((vehicle) => vehicle.id === bikeId)) {
    throw new Error("Vehicle is no longer available for this period");
  }
}

export async function listOpenRentalBikeIds(context: AvailabilityContext): Promise<Set<string>> {
  const { data, error } = await context.supabase.from("rentals").select("bike_id")
    .eq("company_id", context.companyId).in("status", ["active", "overdue"]).is("deleted_at", null);
  if (error) throw new Error(`Unable to resolve rented vehicles: ${error.message}`);
  return new Set((data ?? []).map((row) => row.bike_id).filter((id): id is string => typeof id === "string"));
}
