import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ServicePartMovementType = "receipt" | "issue" | "return" | "adjustment";

export interface ServicePart {
  id: string;
  partNumber: string;
  name: string;
  category: string;
  unit: string;
  description: string;
  reorderLevel: number;
  unitCost: number;
  quantityOnHand: number;
  isLowStock: boolean;
  isActive: boolean;
  updatedAt: string;
}

export interface ServicePartMovement {
  id: string;
  partId: string;
  movementType: ServicePartMovementType;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost: number;
  referenceType: string;
  notes: string;
  occurredAt: string;
}

export interface ServicePartDirectoryData {
  parts: ServicePart[];
  movements: ServicePartMovement[];
  canManage: boolean;
  totals: { active: number; lowStock: number; unitsOnHand: number; stockValue: number };
}

type PermissionMap = Record<string, string[]>;

function permissionsFrom(value: unknown): PermissionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, actions]) => Array.isArray(actions))
      .map(([module, actions]) => [module, (actions as unknown[]).filter((action): action is string => typeof action === "string")]),
  );
}

function canManage(role: string, permissions: PermissionMap) {
  if (role === "admin" || role === "super_admin") return true;
  return Object.entries(permissions)
    .filter(([module]) => ["service", "service & maintenance", "maintenance"].includes(module.toLowerCase()))
    .flatMap(([, actions]) => actions)
    .some((action) => ["create", "edit", "manage"].includes(action.toLowerCase()));
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
  return { supabase, profile, canManage: canManage(profile.role, permissionsFrom(role?.permissions)) };
}

export async function getServicePartDirectory(): Promise<ServicePartDirectoryData> {
  const a = await actor();
  const [{ data: partRows, error: partError }, { data: movementRows, error: movementError }] = await Promise.all([
    a.supabase.from("service_parts")
      .select("id,part_number,name,category,unit,description,reorder_level,unit_cost,is_active,updated_at")
      .eq("company_id", a.profile.company_id)
      .is("deleted_at", null)
      .order("is_active", { ascending: false })
      .order("name"),
    a.supabase.from("service_part_stock_movements")
      .select("id,part_id,movement_type,quantity_delta,quantity_before,quantity_after,unit_cost,reference_type,notes,occurred_at")
      .eq("company_id", a.profile.company_id)
      .order("occurred_at", { ascending: false })
      .limit(1000),
  ]);
  if (partError) throw new Error(`Unable to load service parts: ${partError.message}`);
  if (movementError) throw new Error(`Unable to load stock movements: ${movementError.message}`);
  const movements = ((movementRows ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    partId: String(row.part_id),
    movementType: String(row.movement_type) as ServicePartMovementType,
    quantityDelta: Number(row.quantity_delta ?? 0),
    quantityBefore: Number(row.quantity_before ?? 0),
    quantityAfter: Number(row.quantity_after ?? 0),
    unitCost: Number(row.unit_cost ?? 0),
    referenceType: String(row.reference_type ?? ""),
    notes: String(row.notes ?? ""),
    occurredAt: String(row.occurred_at),
  }));
  const quantities = new Map<string, number>();
  for (const movement of movements) quantities.set(movement.partId, (quantities.get(movement.partId) ?? 0) + movement.quantityDelta);
  const parts = ((partRows ?? []) as unknown as Record<string, unknown>[]).map((row) => {
    const quantityOnHand = quantities.get(String(row.id)) ?? 0;
    const reorderLevel = Number(row.reorder_level ?? 0);
    return {
      id: String(row.id),
      partNumber: String(row.part_number),
      name: String(row.name),
      category: String(row.category ?? ""),
      unit: String(row.unit),
      description: String(row.description ?? ""),
      reorderLevel,
      unitCost: Number(row.unit_cost ?? 0),
      quantityOnHand,
      isLowStock: quantityOnHand <= reorderLevel,
      isActive: Boolean(row.is_active),
      updatedAt: String(row.updated_at),
    } satisfies ServicePart;
  });
  return {
    parts,
    movements: movements.slice(0, 30),
    canManage: a.canManage,
    totals: {
      active: parts.filter((part) => part.isActive).length,
      lowStock: parts.filter((part) => part.isActive && part.isLowStock).length,
      unitsOnHand: parts.reduce((sum, part) => sum + part.quantityOnHand, 0),
      stockValue: parts.reduce((sum, part) => sum + part.quantityOnHand * part.unitCost, 0),
    },
  };
}

export interface CreateServicePartInput {
  partNumber: string;
  name: string;
  category?: string;
  unit?: string;
  description?: string;
  reorderLevel: number;
  unitCost: number;
}

export async function createServicePart(input: CreateServicePartInput) {
  const a = await actor();
  if (!a.canManage) throw new Error("You do not have permission to manage service parts");
  const { data, error } = await a.supabase.rpc("create_service_part", {
    p_part_number: input.partNumber.trim(), p_name: input.name.trim(), p_category: input.category?.trim() || null,
    p_unit: input.unit?.trim() || "piece", p_description: input.description?.trim() || null,
    p_reorder_level: input.reorderLevel, p_unit_cost: input.unitCost,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Service part was not created");
  return { partId: String(row.part_id), name: String(row.name) };
}

export async function archiveServicePart(partId: string) {
  const a = await actor();
  if (!a.canManage) throw new Error("You do not have permission to archive service parts");
  const { data, error } = await a.supabase.rpc("archive_service_part", { p_part_id: partId });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Service part was not archived");
  return { partId: String(row.part_id) };
}

export async function recordServicePartStockMovement(input: {
  partId: string;
  movementType: ServicePartMovementType;
  quantityDelta: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}) {
  const a = await actor();
  if (!a.canManage) throw new Error("You do not have permission to manage service-part stock");
  const { data, error } = await a.supabase.rpc("record_service_part_stock_movement", {
    p_part_id: input.partId, p_movement_type: input.movementType, p_quantity_delta: input.quantityDelta,
    p_unit_cost: input.unitCost ?? null, p_reference_type: input.referenceType?.trim() || null,
    p_reference_id: input.referenceId || null, p_notes: input.notes?.trim() || null,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Stock movement was not recorded");
  return { quantityAfter: Number(row.quantity_after), quantityDelta: Number(row.quantity_delta) };
}
