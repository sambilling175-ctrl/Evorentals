import "server-only";

import { createClient } from "@/lib/supabase/server";

type PermissionMap = Record<string, string[]>;

export type VehicleAvailability = "available" | "rented" | "reserved" | "maintenance" | "retired";

export interface VehicleRecord {
  id: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  variant: string;
  color: string;
  category: string;
  registrationNumber: string;
  vinNumber: string;
  manufacturingYear: number | null;
  purchaseDate: string;
  currentOdometer: number;
  batteryLevel: number;
  notes: string;
  status: string;
  availability: string;
  lastServicedAt: string;
  updatedAt: string;
}

export interface FleetWorkspaceData {
  vehicles: VehicleRecord[];
  canManage: boolean;
  totals: { all: number; available: number; rented: number; reserved: number; maintenance: number };
}

const KNOWN_AVAILABILITY: VehicleAvailability[] = ["available", "rented", "reserved", "maintenance", "retired"];

function permissionsFrom(value: unknown): PermissionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: PermissionMap = {};
  for (const [module, actions] of Object.entries(value)) {
    if (Array.isArray(actions)) result[module] = actions.filter((action): action is string => typeof action === "string");
  }
  return result;
}

function hasPermission(role: string, permissions: PermissionMap, module: string, accepted: string[]) {
  if (role === "admin" || role === "super_admin") return true;
  const actions = Object.entries(permissions).find(([name]) => name.toLowerCase() === module.toLowerCase())?.[1] ?? [];
  return actions.some((action) => accepted.some((allowed) => action.toLowerCase() === allowed.toLowerCase()));
}

async function getActor() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("id,company_id,role,status").eq("id", user.id).is("deleted_at", null).maybeSingle();
  if (profileError || !profile || profile.status !== "active") throw new Error("Active employee profile required");
  return { supabase, user, profile };
}

type Actor = Awaited<ReturnType<typeof getActor>>;

async function getActorPermissions({ supabase, profile }: Actor) {
  const { data: actorRole, error } = await supabase.from("roles").select("permissions")
    .eq("company_id", profile.company_id).eq("name", profile.role).is("deleted_at", null).maybeSingle();
  if (error) throw new Error(error.message);
  return permissionsFrom(actorRole?.permissions);
}

function normalizeAvailability(status: string | null): string {
  const normalized = (status ?? "").trim().toLowerCase();
  return KNOWN_AVAILABILITY.includes(normalized as VehicleAvailability) ? normalized : normalized || "unknown";
}

export async function getFleetWorkspace(): Promise<FleetWorkspaceData> {
  const actor = await getActor();
  const { supabase, profile } = actor;
  const [bikesResult, rentalsResult, actorPermissions] = await Promise.all([
    supabase.from("bikes")
      .select("id,serial_number,model,manufacturer,variant,color,category,registration_number,vin_number,manufacturing_year,purchase_date,current_odometer,battery_level,notes,status,last_serviced_at,updated_at")
      .eq("company_id", profile.company_id).is("deleted_at", null).order("serial_number"),
    supabase.from("rentals").select("bike_id")
      .eq("company_id", profile.company_id).is("deleted_at", null).eq("status", "active"),
    getActorPermissions(actor),
  ]);
  const firstError = bikesResult.error ?? rentalsResult.error;
  if (firstError) throw new Error(`Unable to load fleet: ${firstError.message}`);

  if (!hasPermission(profile.role, actorPermissions, "Vehicles", ["View", "Manage", "Edit"])) {
    throw new Error("You do not have permission to view the fleet");
  }

  const onRentIds = new Set(
    (rentalsResult.data ?? []).map((rental) => rental.bike_id).filter((id): id is string => typeof id === "string"),
  );

  const vehicles = (bikesResult.data ?? []).map((bike): VehicleRecord => ({
    id: bike.id,
    serialNumber: bike.serial_number ?? "Not assigned",
    model: bike.model ?? "Unknown model",
    manufacturer: bike.manufacturer ?? "",
    variant: bike.variant ?? "",
    color: bike.color ?? "",
    category: bike.category ?? "",
    registrationNumber: bike.registration_number ?? "",
    vinNumber: bike.vin_number ?? "",
    manufacturingYear: bike.manufacturing_year ?? null,
    purchaseDate: bike.purchase_date ?? "",
    currentOdometer: bike.current_odometer ?? 0,
    batteryLevel: bike.battery_level ?? 100,
    notes: bike.notes ?? "",
    status: bike.status ?? "",
    availability: onRentIds.has(bike.id) ? "rented" : normalizeAvailability(bike.status),
    lastServicedAt: bike.last_serviced_at ?? "",
    updatedAt: bike.updated_at ?? "",
  }));

  return {
    vehicles,
    canManage: hasPermission(profile.role, actorPermissions, "Vehicles", ["Manage", "Edit"]),
    totals: {
      all: vehicles.length,
      available: vehicles.filter((vehicle) => vehicle.availability === "available").length,
      rented: vehicles.filter((vehicle) => vehicle.availability === "rented").length,
      reserved: vehicles.filter((vehicle) => vehicle.availability === "reserved").length,
      maintenance: vehicles.filter((vehicle) => vehicle.availability === "maintenance").length,
    },
  };
}

export interface VehicleInput {
  serialNumber: string;
  model: string;
  manufacturer: string | null;
  variant: string | null;
  color: string | null;
  category: string | null;
  registrationNumber: string | null;
  vinNumber: string | null;
  manufacturingYear: number | null;
  purchaseDate: string | null;
  currentOdometer: number;
  batteryLevel: number;
  notes: string | null;
  status: "available" | "reserved" | "maintenance" | "retired";
}

function toDbValues(values: VehicleInput) {
  return {
    serial_number: values.serialNumber,
    model: values.model,
    manufacturer: values.manufacturer,
    variant: values.variant,
    color: values.color,
    category: values.category,
    registration_number: values.registrationNumber,
    vin_number: values.vinNumber,
    manufacturing_year: values.manufacturingYear,
    purchase_date: values.purchaseDate,
    current_odometer: values.currentOdometer,
    battery_level: values.batteryLevel,
    notes: values.notes,
    status: values.status,
  };
}

export async function createVehicleRecord(values: VehicleInput) {
  const actor = await getActor();
  const { supabase, user, profile } = actor;
  const permissions = await getActorPermissions(actor);
  if (!hasPermission(profile.role, permissions, "Vehicles", ["Manage", "Edit"])) {
    throw new Error("You do not have permission to manage the fleet");
  }

  const { error } = await supabase.from("bikes").insert({
    ...toDbValues(values),
    company_id: profile.company_id,
    created_by: user.id,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }).select("id").single();
  if (error) throw new Error(error.message);
}

export async function updateVehicleRecord(vehicleId: string, values: VehicleInput) {
  const actor = await getActor();
  const { supabase, user, profile } = actor;
  const permissions = await getActorPermissions(actor);
  if (!hasPermission(profile.role, permissions, "Vehicles", ["Manage", "Edit"])) {
    throw new Error("You do not have permission to manage the fleet");
  }

  const { data, error } = await supabase.from("bikes").update({
    ...toDbValues(values),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }).eq("id", vehicleId).eq("company_id", profile.company_id).is("deleted_at", null).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Vehicle not found or you do not have access");
}
