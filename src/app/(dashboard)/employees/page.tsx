import { EmployeeWorkspace } from "@/components/employees/employee-workspace";
import { getEmployeeWorkspace } from "@/lib/services/employees";

export default async function EmployeesPage() {
  const data = await getEmployeeWorkspace();
  return (
    <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Workforce access</p><h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Employees</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Company staff directory, operational assignments, role access, account status, and append-only change history.</p></div><EmployeeWorkspace data={data} /></div>
  );
}
