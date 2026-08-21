"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceJobCard, createServiceRequest, transitionServiceJobCard, type ServiceJobCardStatus } from "@/lib/services/service";

export interface ServiceRequestActionState {
  status: "idle" | "success" | "error";
  message: string;
}

export const initialServiceRequestActionState: ServiceRequestActionState = { status: "idle", message: "" };

export interface ServiceJobCardActionState {
  status: "idle" | "success" | "error";
  message: string;
}

export const initialServiceJobCardActionState: ServiceJobCardActionState = { status: "idle", message: "" };

const requestSchema = z.object({
  bikeId: z.uuid("Select a vehicle"),
  reasonId: z.uuid("Select a service reason"),
  description: z.string().trim().min(5, "Describe the service issue in at least 5 characters").max(2000),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

export async function submitServiceRequest(
  _state: ServiceRequestActionState,
  formData: FormData,
): Promise<ServiceRequestActionState> {
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the service request details" };
  try {
    const result = await createServiceRequest(parsed.data);
    revalidatePath("/service");
    return { status: "success", message: `Request ${result.requestNumber} created` };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to create service request" };
  }
}

const jobCardSchema = z.object({ serviceRequestId: z.uuid("Select a service request") });

export async function createServiceJobCardAction(
  _state: ServiceJobCardActionState,
  formData: FormData,
): Promise<ServiceJobCardActionState> {
  const parsed = jobCardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Select a service request" };
  try {
    const result = await createServiceJobCard(parsed.data.serviceRequestId);
    revalidatePath("/service");
    return { status: "success", message: `Job card ${result.jobCardNumber} created` };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to create job card" };
  }
}

const transitionSchema = z.object({
  toStatus: z.enum(["requested", "inspection", "in_service", "waiting_parts", "qc", "completed"]),
  notes: z.string().trim().max(1000, "Transition notes cannot exceed 1000 characters").optional(),
});

export async function transitionServiceJobCardAction(
  jobCardId: string,
  _state: ServiceJobCardActionState,
  formData: FormData,
): Promise<ServiceJobCardActionState> {
  const parsed = transitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Select the next status" };
  try {
    const result = await transitionServiceJobCard({ jobCardId, toStatus: parsed.data.toStatus as ServiceJobCardStatus, notes: parsed.data.notes });
    revalidatePath("/service");
    return { status: "success", message: `${result.jobCardNumber} moved to ${result.status.replaceAll("_", " ")}` };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to transition job card" };
  }
}
