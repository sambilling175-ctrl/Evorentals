"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createVehicleRecord, updateVehicleRecord } from "@/lib/services/fleet";

export interface VehicleActionState { status: "idle" | "success" | "error"; message: string }
export const initialVehicleActionState: VehicleActionState = { status: "idle", message: "" };

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const emptyToNull = (value: unknown) => (value === "" || value == null ? null : value);

const vehicleSchema = z.object({
  serialNumber: z.string().trim().min(2, "Enter the vehicle serial or fleet ID").max(40).regex(/^[A-Za-z0-9/_-]+$/, "Use letters, numbers, slash, underscore, or hyphen"),
  model: z.string().trim().min(2, "Enter the model").max(100),
  manufacturer: optionalText(100),
  variant: optionalText(100),
  color: optionalText(50),
  category: optionalText(100),
  registrationNumber: z.string().trim().max(15, "Registration numbers are up to 15 characters").transform((value) => (value ? value.toUpperCase() : null)),
  vinNumber: optionalText(100),
  manufacturingYear: z.preprocess(emptyToNull, z.coerce.number().int().min(2000, "Enter a valid year").max(new Date().getFullYear() + 1, "Enter a valid year").nullable()),
  purchaseDate: z.preprocess(emptyToNull, z.iso.date().nullable()),
  currentOdometer: z.preprocess((value) => (value === "" || value == null ? 0 : value), z.coerce.number().int().min(0, "Odometer cannot be negative")),
  batteryLevel: z.preprocess((value) => (value === "" || value == null ? 100 : value), z.coerce.number().int().min(0).max(100, "Battery level is 0-100")),
  notes: optionalText(500),
  status: z.enum(["available", "reserved", "maintenance", "retired"]),
});

export async function registerVehicle(_state: VehicleActionState, formData: FormData): Promise<VehicleActionState> {
  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the vehicle details" };
  try {
    await createVehicleRecord(parsed.data);
    revalidatePath("/fleet");
    return { status: "success", message: "Vehicle registered" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to register vehicle" };
  }
}

export async function updateVehicle(vehicleId: string, _state: VehicleActionState, formData: FormData): Promise<VehicleActionState> {
  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the vehicle details" };
  try {
    await updateVehicleRecord(vehicleId, parsed.data);
    revalidatePath("/fleet");
    return { status: "success", message: "Vehicle details saved" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to update vehicle" };
  }
}
