import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ServiceVendorType = "garage" | "parts_vendor" | "service_center";

export interface ServiceVendor {
  id: string;
  vendorType: ServiceVendorType;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceVendorDirectoryData {
  vendors: ServiceVendor[];
  canManage: boolean;
  totals: { active: number; garages: number; partsVendors: number; serviceCenters: number };
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

export async function getServiceVendorDirectory(): Promise<ServiceVendorDirectoryData> {
  const a = await actor();
  const { data, error } = await a.supabase.from("service_vendors")
    .select("id,vendor_type,name,contact_name,phone,email,address,gstin,notes,is_active,created_at,updated_at")
    .eq("company_id", a.profile.company_id)
    .is("deleted_at", null)
    .order("is_active", { ascending: false })
    .order("name");
  if (error) throw new Error(`Unable to load service vendors: ${error.message}`);
  const vendors = ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    vendorType: String(row.vendor_type) as ServiceVendorType,
    name: String(row.name),
    contactName: String(row.contact_name ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    address: String(row.address ?? ""),
    gstin: String(row.gstin ?? ""),
    notes: String(row.notes ?? ""),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
  return {
    vendors,
    canManage: a.canManage,
    totals: {
      active: vendors.filter((vendor) => vendor.isActive).length,
      garages: vendors.filter((vendor) => vendor.vendorType === "garage").length,
      partsVendors: vendors.filter((vendor) => vendor.vendorType === "parts_vendor").length,
      serviceCenters: vendors.filter((vendor) => vendor.vendorType === "service_center").length,
    },
  };
}

export interface CreateServiceVendorInput {
  vendorType: ServiceVendorType;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  notes?: string;
}

export async function createServiceVendor(input: CreateServiceVendorInput) {
  const a = await actor();
  if (!a.canManage) throw new Error("You do not have permission to manage service vendors");
  const { data, error } = await a.supabase.rpc("create_service_vendor", {
    p_vendor_type: input.vendorType,
    p_name: input.name.trim(),
    p_contact_name: input.contactName?.trim() || null,
    p_phone: input.phone?.trim() || null,
    p_email: input.email?.trim() || null,
    p_address: input.address?.trim() || null,
    p_gstin: input.gstin?.trim() || null,
    p_notes: input.notes?.trim() || null,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Service vendor was not created");
  return { vendorId: String(row.vendor_id), name: String(row.name) };
}

export async function archiveServiceVendor(vendorId: string) {
  const a = await actor();
  if (!a.canManage) throw new Error("You do not have permission to archive service vendors");
  const { data, error } = await a.supabase.rpc("archive_service_vendor", { p_vendor_id: vendorId });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Service vendor was not archived");
  return { vendorId: String(row.vendor_id) };
}
