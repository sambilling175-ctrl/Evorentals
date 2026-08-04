import "server-only";

import { createClient } from "@/lib/supabase/server";

type PermissionMap = Record<string, string[]>;

export interface EmployeeRecord {
  id: string;
  email: string;
  fullName: string;
  employeeNumber: string;
  phone: string;
  role: string;
  department: string;
  designation: string;
  joiningDate: string;
  status: "active" | "disabled";
}

export interface EmployeeRole {
  name: string;
  description: string;
  permissions: PermissionMap;
}

export interface EmployeeAccessEvent {
  id: string;
  employeeName: string;
  actorName: string;
  summary: string;
  occurredAt: string;
}

export interface EmployeeWorkspaceData {
  employees: EmployeeRecord[];
  roles: EmployeeRole[];
  recentEvents: EmployeeAccessEvent[];
  canManage: boolean;
  totals: { all: number; active: number; disabled: number; administrators: number };
}

function permissionsFrom(value: unknown): PermissionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: PermissionMap = {};
  for (const [module, actions] of Object.entries(value)) {
    if (Array.isArray(actions)) result[module] = actions.filter((action): action is string => typeof action === "string");
  }
  return result;
}

function hasPermission(role: string, permissions: PermissionMap, module: string, accepted: string[]) {
  if (role === "admin" || role === "super_admin") return true;
  const actions = Object.entries(permissions).find(([name]) => name.toLowerCase() === module.toLowerCase())?.[1] ?? [];
  return actions.some((action) => accepted.some((allowed) => action.toLowerCase() === allowed.toLowerCase()));
}

async function getActor() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("id,company_id,role,status").eq("id", user.id).is("deleted_at", null).maybeSingle();
  if (profileError || !profile || profile.status !== "active") throw new Error("Active employee profile required");
  return { supabase, user, profile };
}

export async function getEmployeeWorkspace(): Promise<EmployeeWorkspaceData> {
  const { supabase, profile } = await getActor();
  const [profilesResult, rolesResult, eventsResult] = await Promise.all([
    supabase.from("profiles").select("id,email,full_name,employee_id,phone,role,department,designation,joining_date,status")
      .eq("company_id", profile.company_id).is("deleted_at", null).order("full_name"),
    supabase.from("roles").select("name,description,permissions").eq("company_id", profile.company_id)
      .is("deleted_at", null).order("name"),
    supabase.from("employee_access_events").select("id,employee_id,actor_id,summary,occurred_at")
      .eq("company_id", profile.company_id).order("occurred_at", { ascending: false }).limit(8),
  ]);
  const firstError = profilesResult.error ?? rolesResult.error ?? eventsResult.error;
  if (firstError) throw new Error(`Unable to load employees: ${firstError.message}`);

  const roleRows = rolesResult.data ?? [];
  const actorRole = roleRows.find((role) => role.name === profile.role);
  const actorPermissions = permissionsFrom(actorRole?.permissions);
  if (!hasPermission(profile.role, actorPermissions, "Employees", ["View", "Manage", "Edit"])) {
    throw new Error("You do not have permission to view employees");
  }

  const employees = (profilesResult.data ?? []).map((employee): EmployeeRecord => ({
    id: employee.id,
    email: employee.email,
    fullName: employee.full_name ?? employee.email.split("@")[0],
    employeeNumber: employee.employee_id ?? "Not assigned",
    phone: employee.phone ?? "",
    role: employee.role,
    department: employee.department ?? "Operations",
    designation: employee.designation ?? "Staff",
    joiningDate: employee.joining_date ?? "",
    status: employee.status === "disabled" ? "disabled" : "active",
  }));
  const names = new Map(employees.map((employee) => [employee.id, employee.fullName]));
  const roles = roleRows.map((role): EmployeeRole => ({
    name: role.name,
    description: role.description ?? "No description",
    permissions: permissionsFrom(role.permissions),
  }));

  return {
    employees,
    roles,
    recentEvents: (eventsResult.data ?? []).map((event) => ({
      id: event.id,
      employeeName: names.get(event.employee_id) ?? "Employee",
      actorName: event.actor_id ? names.get(event.actor_id) ?? "Administrator" : "System",
      summary: event.summary,
      occurredAt: event.occurred_at,
    })),
    canManage: hasPermission(profile.role, actorPermissions, "Employees", ["Manage", "Edit"]),
    totals: {
      all: employees.length,
      active: employees.filter((employee) => employee.status === "active").length,
      disabled: employees.filter((employee) => employee.status === "disabled").length,
      administrators: employees.filter((employee) => employee.status === "active" && ["admin", "super_admin"].includes(employee.role)).length,
    },
  };
}

export interface EmployeeUpdateInput {
  fullName: string;
  phone: string;
  employeeNumber: string;
  department: string;
  designation: string;
  joiningDate: string;
  role: string;
  status: "active" | "disabled";
}

export async function updateEmployeeRecord(employeeId: string, values: EmployeeUpdateInput) {
  const { supabase, profile } = await getActor();
  const { data: actorRole, error: roleError } = await supabase.from("roles").select("permissions")
    .eq("company_id", profile.company_id).eq("name", profile.role).is("deleted_at", null).maybeSingle();
  if (roleError) throw new Error(roleError.message);
  if (!hasPermission(profile.role, permissionsFrom(actorRole?.permissions), "Employees", ["Manage", "Edit"])) {
    throw new Error("You do not have permission to manage employees");
  }

  const { data: allowedRole, error: allowedRoleError } = await supabase.from("roles").select("name")
    .eq("company_id", profile.company_id).eq("name", values.role).is("deleted_at", null).maybeSingle();
  if (allowedRoleError) throw new Error(allowedRoleError.message);
  if (!allowedRole) throw new Error("Selected role is not available for this company");

  const { error } = await supabase.rpc("admin_update_employee", {
    p_employee_id: employeeId,
    p_full_name: values.fullName,
    p_phone: values.phone,
    p_employee_number: values.employeeNumber,
    p_department: values.department,
    p_designation: values.designation,
    p_joining_date: values.joiningDate,
    p_role: values.role,
    p_status: values.status,
  });
  if (error) throw new Error(error.message);
}
