import "server-only";

import { createClient } from "@/lib/supabase/server";

type PermissionMap = Record<string, string[]>;

export type ServicePriority = "low" | "medium" | "high" | "urgent";
export type ServiceRequestStatus = "requested" | "cancelled";
export type ServiceJobCardStatus = "requested" | "inspection" | "in_service" | "waiting_parts" | "qc" | "completed";

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

export interface ServiceJobCard {
  id: string;
  number: string;
  requestId: string;
  vehicle: string;
  reason: string;
  status: ServiceJobCardStatus;
  intakeInspection: ServiceIntakeInspection | null;
  currentOdometer: number;
  currentBatteryLevel: number;
  notes: string;
  startedAt: string;
  completedAt: string;
  updatedAt: string;
}

export interface ServiceIntakeInspection {
  id: string;
  inspectedAt: string;
  odometer: number;
  batteryLevel: number;
  condition: "excellent" | "good" | "fair" | "damaged";
  checklist: Record<string, boolean>;
  notes: string;
  evidenceMetadata: Record<string, unknown>[];
}

export interface ServiceWorkspaceData {
  reasons: ServiceReason[];
  vehicles: ServiceVehicle[];
  requests: ServiceRequest[];
  jobCards: ServiceJobCard[];
  canCreate: boolean;
  totals: { requests: number; requested: number; highPriority: number; activeReasons: number; jobCards: number; activeJobs: number };
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

  const [reasonsResult, requestsResult, vehiclesResult, jobCardsResult, intakeResult] = await Promise.all([
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
    a.supabase.from("service_job_cards")
      .select("id,job_card_number,service_request_id,bike_id,status,notes,started_at,completed_at,updated_at")
      .eq("company_id", a.profile.company_id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(200),
    a.supabase.from("service_intake_inspections")
      .select("id,job_card_id,inspected_at,odometer,battery_level,condition,checklist,notes,evidence_metadata")
      .eq("company_id", a.profile.company_id)
      .order("inspected_at", { ascending: false })
      .limit(200),
  ]);

  const error = reasonsResult.error ?? requestsResult.error ?? vehiclesResult.error ?? jobCardsResult.error ?? intakeResult.error;
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
  const requestById = new Map(requests.map((request) => [request.id, request]));
  const intakeByJobCard = new Map<string, ServiceIntakeInspection>();
  for (const row of (intakeResult.data ?? []) as unknown as Record<string, unknown>[]) {
    const checklist = row.checklist && typeof row.checklist === "object" && !Array.isArray(row.checklist)
      ? Object.fromEntries(Object.entries(row.checklist).filter(([, value]) => typeof value === "boolean")) as Record<string, boolean>
      : {};
    const evidenceMetadata = Array.isArray(row.evidence_metadata)
      ? row.evidence_metadata.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value))
      : [];
    intakeByJobCard.set(String(row.job_card_id), {
      id: String(row.id), inspectedAt: String(row.inspected_at), odometer: numberValue(row.odometer),
      batteryLevel: numberValue(row.battery_level), condition: String(row.condition) as ServiceIntakeInspection["condition"],
      checklist, notes: String(row.notes ?? ""), evidenceMetadata,
    });
  }
  const jobCards = ((jobCardsResult.data ?? []) as unknown as Record<string, unknown>[]).map((row) => {
    const request = requestById.get(String(row.service_request_id));
    const vehicle = vehicleById.get(String(row.bike_id));
    return {
      id: String(row.id), number: String(row.job_card_number), requestId: String(row.service_request_id),
      vehicle: request?.vehicle ?? (vehicle ? `${String(vehicle.serial_number)} · ${String(vehicle.model)}` : "Unknown vehicle"),
      reason: request?.reason ?? "Service request", status: String(row.status) as ServiceJobCardStatus,
      intakeInspection: intakeByJobCard.get(String(row.id)) ?? null,
      currentOdometer: numberValue(vehicle?.current_odometer),
      currentBatteryLevel: numberValue(vehicle?.battery_level),
      notes: String(row.notes ?? ""), startedAt: String(row.started_at ?? ""),
      completedAt: String(row.completed_at ?? ""), updatedAt: String(row.updated_at),
    };
  });

  return {
    reasons, vehicles, requests, jobCards,
    canCreate: allowed(a.profile.role, a.permissions, ["Create", "Edit", "Manage"]),
    totals: {
      requests: requests.length,
      requested: requests.filter((request) => request.status === "requested").length,
      highPriority: requests.filter((request) => request.priority === "high" || request.priority === "urgent").length,
      activeReasons: reasons.length,
      jobCards: jobCards.length,
      activeJobs: jobCards.filter((card) => card.status !== "completed").length,
    },
  };
}

export async function createServiceJobCard(serviceRequestId: string) {
  const a = await actor();
  if (!allowed(a.profile.role, a.permissions, ["Create", "Edit", "Manage"])) {
    throw new Error("You do not have permission to create service job cards");
  }
  const { data, error } = await a.supabase.rpc("create_service_job_card", { p_service_request_id: serviceRequestId });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error("Service job card was not created");
  return { jobCardId: String(result.job_card_id), jobCardNumber: String(result.job_card_number) };
}

export async function transitionServiceJobCard(input: { jobCardId: string; toStatus: ServiceJobCardStatus; notes?: string }) {
  const a = await actor();
  if (!allowed(a.profile.role, a.permissions, ["Edit", "Manage"])) {
    throw new Error("You do not have permission to transition service job cards");
  }
  const { data, error } = await a.supabase.rpc("transition_service_job_card", {
    p_job_card_id: input.jobCardId,
    p_to_status: input.toStatus,
    p_notes: input.notes?.trim() || null,
  });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error("Service job card transition did not return a result");
  return { jobCardNumber: String(result.job_card_number), status: String(result.status) as ServiceJobCardStatus };
}

export interface RecordServiceIntakeInspectionInput {
  jobCardId: string;
  odometer: number;
  batteryLevel: number;
  condition: "excellent" | "good" | "fair" | "damaged";
  checklist: Record<string, boolean>;
  notes?: string;
  evidenceMetadata: Record<string, unknown>[];
}

export async function recordServiceIntakeInspection(input: RecordServiceIntakeInspectionInput) {
  const a = await actor();
  if (!allowed(a.profile.role, a.permissions, ["Edit", "Manage"])) {
    throw new Error("You do not have permission to record vehicle intake inspections");
  }
  const { data, error } = await a.supabase.rpc("record_service_intake_inspection", {
    p_job_card_id: input.jobCardId,
    p_odometer: input.odometer,
    p_battery_level: input.batteryLevel,
    p_condition: input.condition,
    p_checklist: input.checklist,
    p_notes: input.notes?.trim() || null,
    p_evidence_metadata: input.evidenceMetadata,
  });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error("Vehicle intake inspection was not recorded");
  return {
    inspectionId: String(result.inspection_id),
    jobCardNumber: String(result.job_card_number),
    status: String(result.status) as ServiceJobCardStatus,
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
