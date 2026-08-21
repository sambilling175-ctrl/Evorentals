"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceRequest } from "@/lib/services/service";

export interface ServiceRequestActionState {
  status: "idle" | "success" | "error";
  message: string;
}

export const initialServiceRequestActionState: ServiceRequestActionState = { status: "idle", message: "" };

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
