"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceJobCard, createServiceRequest, recordServiceIntakeInspection, transitionServiceJobCard, type ServiceJobCardStatus } from "@/lib/services/service";

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

const intakeChecklistSchema = z.string().trim().transform((value, context) => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.values(parsed).some((item) => typeof item !== "boolean")) {
      context.addIssue({ code: "custom", message: "Checklist must be a JSON object of boolean checks" });
      return z.NEVER;
    }
    return parsed as Record<string, boolean>;
  } catch {
    context.addIssue({ code: "custom", message: "Checklist must be valid JSON" });
    return z.NEVER;
  }
});

const evidenceMetadataSchema = z.string().trim().transform((value, context) => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
      context.addIssue({ code: "custom", message: "Evidence metadata must be a JSON array of objects" });
      return z.NEVER;
    }
    return parsed as Record<string, unknown>[];
  } catch {
    context.addIssue({ code: "custom", message: "Evidence metadata must be valid JSON" });
    return z.NEVER;
  }
});

const intakeSchema = z.object({
  jobCardId: z.uuid("Select a job card"),
  odometer: z.coerce.number().int().min(0, "Odometer cannot be negative").max(99_999_999),
  batteryLevel: z.coerce.number().int().min(0).max(100),
  condition: z.enum(["excellent", "good", "fair", "damaged"]),
  checklist: intakeChecklistSchema,
  notes: z.string().trim().max(2000, "Intake notes cannot exceed 2000 characters").optional(),
  evidenceMetadata: evidenceMetadataSchema,
});

export async function recordServiceIntakeInspectionAction(
  _state: ServiceJobCardActionState,
  formData: FormData,
): Promise<ServiceJobCardActionState> {
  const parsed = intakeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the intake inspection details" };
  try {
    const result = await recordServiceIntakeInspection(parsed.data);
    revalidatePath("/service");
    return { status: "success", message: `${result.jobCardNumber} intake recorded; stage is ${result.status.replaceAll("_", " ")}` };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to record vehicle intake inspection" };
  }
}
