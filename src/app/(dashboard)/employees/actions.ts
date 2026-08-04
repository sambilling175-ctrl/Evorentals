"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateEmployeeRecord } from "@/lib/services/employees";

export interface EmployeeActionState { status: "idle" | "success" | "error"; message: string }
export const initialEmployeeActionState: EmployeeActionState = { status: "idle", message: "" };

const employeeSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^$|^[6-9]\d{9}$/, "Enter a valid Indian mobile number"),
  employeeNumber: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9/_-]+$/, "Use letters, numbers, slash, underscore, or hyphen"),
  department: z.string().trim().min(2).max(80),
  designation: z.string().trim().min(2).max(80),
  joiningDate: z.iso.date(),
  role: z.string().trim().min(2).max(40),
  status: z.enum(["active", "disabled"]),
});

export async function updateEmployee(employeeId: string, _state: EmployeeActionState, formData: FormData): Promise<EmployeeActionState> {
  const parsed = employeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the employee details" };
  try {
    await updateEmployeeRecord(employeeId, parsed.data);
    revalidatePath("/employees");
    return { status: "success", message: "Employee access and profile saved" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to update employee" };
  }
}
