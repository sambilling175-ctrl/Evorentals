import "server-only";

import { createClient } from "@/lib/supabase/server";

type PermissionMap = Record<string, string[]>;

export type ServicePriority = "low" | "medium" | "high" | "urgent";
export type ServiceRequestStatus = "requested" | "cancelled";

export interface ServiceReason {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  sortOrder: number;
}

export interface ServiceVehicle {
  id: string;
  label: string;
  model: string;
  status: string;
  currentOdometer: number;
  batteryLevel: number;
}

export interface ServiceRequest {
  id: string;
  number: string;
  vehicle: string;
  reason: string;
  reasonCategory: string;
  description: string;
  priority: ServicePriority;
  status: ServiceRequestStatus;
  source: string;
  requestedAt: string;
}

export interface ServiceWorkspaceData {
  reasons: ServiceReason[];
  vehicles: ServiceVehicle[];
  requests: ServiceRequest[];
  canCreate: boolean;
  totals: { requests: number; requested: number; highPriority: number; activeReasons: number };
}

function permissionsFrom(value: unknown): PermissionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: PermissionMap = {};
  for (const [module, actions] of Object.entries(value)) {
    if (Array.isArray(actions)) result[module] = actions.filter((action): action is string => typeof action === "string");
  }
  return result;
}

function allowed(role: string, permissions: PermissionMap, actions: string[]) {
  if (role === "admin" || role === "super_admin") return true;
  const available = Object.entries(permissions)
    .filter(([key]) => ["service", "service & maintenance", "maintenance"].includes(key.toLowerCase()))
    .flatMap(([, values]) => values);
  return available.some((value) => actions.some((action) => value.toLowerCase() === action.toLowerCase()));
}

async function actor() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("id,company_id,role,status")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (profileError || !profile || profile.status !== "active") throw new Error("Active employee profile required");
  const { data: role, error: roleError } = await supabase.from("roles")
    .select("permissions")
    .eq("company_id", profile.company_id)
    .eq("name", profile.role)
    .is("deleted_at", null)
    .maybeSingle();
  if (roleError) throw new Error(roleError.message);
  return { supabase, user, profile, permissions: permissionsFrom(role?.permissions) };
}

const numberValue = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

export async function getServiceWorkspace(): Promise<ServiceWorkspaceData> {
  const a = await actor();
  if (!allowed(a.profile.role, a.permissions, ["View", "Create", "Edit", "Manage"])) {
    throw new Error("You do not have permission to view service operations");
  }

  const [reasonsResult, requestsResult, vehiclesResult] = await Promise.all([
    a.supabase.from("service_reasons")
      .select("id,code,name,description,category,sort_order")
      .eq("company_id", a.profile.company_id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order")
      .order("name"),
    a.supabase.from("service_requests")
      .select("id,request_number,bike_id,reason_id,description,priority,status,source,requested_at")
      .eq("company_id", a.profile.company_id)
      .is("deleted_at", null)
      .order("requested_at", { ascending: false })
      .limit(200),
    a.supabase.from("bikes")
      .select("id,serial_number,model,status,current_odometer,battery_level")
      .eq("company_id", a.profile.company_id)
      .neq("status", "retired")
      .is("deleted_at", null)
      .order("serial_number"),
  ]);

  const error = reasonsResult.error ?? requestsResult.error ?? vehiclesResult.error;
  if (error) throw new Error(`Unable to load service operations: ${error.message}`);

  const reasons = ((reasonsResult.data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
    id: String(row.id), code: String(row.code), name: String(row.name), description: String(row.description ?? ""),
    category: String(row.category), sortOrder: numberValue(row.sort_order),
  }));
  const reasonById = new Map(reasons.map((reason) => [reason.id, reason]));
  const vehicleRows = (vehiclesResult.data ?? []) as unknown as Record<string, unknown>[];
  const vehicleById = new Map(vehicleRows.map((vehicle) => [String(vehicle.id), vehicle]));
  const vehicles = vehicleRows.map((vehicle) => ({
    id: String(vehicle.id),
    label: `${String(vehicle.serial_number)} · ${String(vehicle.model)}`,
    model: String(vehicle.model),
    status: String(vehicle.status),
    currentOdometer: numberValue(vehicle.current_odometer),
    batteryLevel: numberValue(vehicle.battery_level),
  }));
  const requests = ((requestsResult.data ?? []) as unknown as Record<string, unknown>[]).map((row) => {
    const reason = reasonById.get(String(row.reason_id));
    const vehicle = vehicleById.get(String(row.bike_id));
    return {
      id: String(row.id), number: String(row.request_number),
      vehicle: vehicle ? `${String(vehicle.serial_number)} · ${String(vehicle.model)}` : "Unknown vehicle",
      reason: reason?.name ?? "Unknown reason", reasonCategory: reason?.category ?? "general",
      description: String(row.description), priority: String(row.priority) as ServicePriority,
      status: String(row.status) as ServiceRequestStatus, source: String(row.source), requestedAt: String(row.requested_at),
    };
  });

  return {
    reasons, vehicles, requests,
    canCreate: allowed(a.profile.role, a.permissions, ["Create", "Edit", "Manage"]),
    totals: {
      requests: requests.length,
      requested: requests.filter((request) => request.status === "requested").length,
      highPriority: requests.filter((request) => request.priority === "high" || request.priority === "urgent").length,
      activeReasons: reasons.length,
    },
  };
}

export interface CreateServiceRequestInput {
  bikeId: string;
  reasonId: string;
  description: string;
  priority: ServicePriority;
  customerId?: string | null;
  rentalId?: string | null;
  source?: "employee" | "customer" | "system";
}

export async function createServiceRequest(input: CreateServiceRequestInput) {
  const a = await actor();
  if (!allowed(a.profile.role, a.permissions, ["Create", "Edit", "Manage"])) {
    throw new Error("You do not have permission to create service requests");
  }
  const { data, error } = await a.supabase.rpc("create_service_request", {
    p_bike_id: input.bikeId,
    p_reason_id: input.reasonId,
    p_description: input.description,
    p_priority: input.priority,
    p_customer_id: input.customerId ?? null,
    p_rental_id: input.rentalId ?? null,
    p_source: input.source ?? "employee",
  });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error("Service request was not created");
  return { requestId: String(result.request_id), requestNumber: String(result.request_number) };
}
