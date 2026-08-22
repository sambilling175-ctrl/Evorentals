"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { archiveServiceVendor, createServiceVendor } from "@/lib/services/service-vendors";

export interface ServiceVendorActionState {
  status: "idle" | "success" | "error";
  message: string;
}

export const initialServiceVendorActionState: ServiceVendorActionState = { status: "idle", message: "" };

const vendorSchema = z.object({
  vendorType: z.enum(["garage", "parts_vendor", "service_center"]),
  name: z.string().trim().min(2, "Enter a vendor name").max(200),
  contactName: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.union([z.literal(""), z.email()]).optional(),
  address: z.string().trim().max(500).optional(),
  gstin: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function createServiceVendorAction(
  _state: ServiceVendorActionState,
  formData: FormData,
): Promise<ServiceVendorActionState> {
  const parsed = vendorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the vendor details" };
  try {
    const result = await createServiceVendor(parsed.data);
    revalidatePath("/service/vendors");
    revalidatePath("/service");
    return { status: "success", message: `${result.name} added to the directory` };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to add service vendor" };
  }
}

export async function archiveServiceVendorAction(
  vendorId: string,
  _state: ServiceVendorActionState,
  _formData: FormData,
): Promise<ServiceVendorActionState> {
  void _state;
  void _formData;
  if (!z.uuid().safeParse(vendorId).success) return { status: "error", message: "Invalid vendor" };
  try {
    await archiveServiceVendor(vendorId);
    revalidatePath("/service/vendors");
    revalidatePath("/service");
    return { status: "success", message: "Vendor archived" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to archive service vendor" };
  }
}
