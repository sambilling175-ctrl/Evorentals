"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { archiveServicePart, createServicePart, recordServicePartStockMovement, type ServicePartMovementType } from "@/lib/services/service-parts";

export interface ServicePartActionState {
  status: "idle" | "success" | "error";
  message: string;
}

export const initialServicePartActionState: ServicePartActionState = { status: "idle", message: "" };

const partSchema = z.object({
  partNumber: z.string().trim().min(2, "Enter a part number").max(80),
  name: z.string().trim().min(2, "Enter a part name").max(200),
  category: z.string().trim().max(120).optional(),
  unit: z.string().trim().min(1).max(32),
  description: z.string().trim().max(500).optional(),
  reorderLevel: z.coerce.number().int().min(0, "Reorder level cannot be negative"),
  unitCost: z.coerce.number().min(0, "Unit cost cannot be negative"),
});

const movementSchema = z.object({
  partId: z.uuid(),
  movementType: z.enum(["receipt", "issue", "return", "adjustment"]),
  quantityDelta: z.coerce.number().int().refine((value) => value !== 0, "Quantity cannot be zero"),
  unitCost: z.union([z.literal(""), z.coerce.number().min(0)]).optional(),
  referenceType: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function createServicePartAction(_state: ServicePartActionState, formData: FormData): Promise<ServicePartActionState> {
  const parsed = partSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the part details" };
  try {
    const result = await createServicePart(parsed.data);
    revalidatePath("/service/parts");
    return { status: "success", message: `${result.name} added to the catalogue` };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to add service part" };
  }
}

export async function recordServicePartMovementAction(_state: ServicePartActionState, formData: FormData): Promise<ServicePartActionState> {
  const parsed = movementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the stock movement" };
  try {
    const result = await recordServicePartStockMovement({
      ...parsed.data,
      movementType: parsed.data.movementType as ServicePartMovementType,
      unitCost: parsed.data.unitCost === "" || parsed.data.unitCost === undefined ? undefined : parsed.data.unitCost,
    });
    revalidatePath("/service/parts");
    return { status: "success", message: `Stock updated to ${result.quantityAfter} units` };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to record stock movement" };
  }
}

export async function archiveServicePartAction(partId: string, _state: ServicePartActionState, _formData: FormData): Promise<ServicePartActionState> {
  void _state;
  void _formData;
  if (!z.uuid().safeParse(partId).success) return { status: "error", message: "Invalid part" };
  try {
    await archiveServicePart(partId);
    revalidatePath("/service/parts");
    return { status: "success", message: "Part archived" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to archive service part" };
  }
}
