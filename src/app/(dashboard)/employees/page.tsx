import { BadgeCheck, Building2, CalendarClock, FileBadge, ShieldCheck, UsersRound } from "lucide-react";
import { ModuleFoundation } from "@/components/operations/module-foundation";

export default function EmployeesPage() {
  return (
    <ModuleFoundation
      title="Employees"
      description="Staff profiles, organizational assignments and ERP access readiness."
      eyebrow="Workforce foundation"
      actionLabel="Add employee"
      items={[
        { title: "Employee directory", description: "Staff identity, contact details and employment status.", icon: UsersRound },
        { title: "Branch assignment", description: "Primary branch, department, designation and reporting manager.", icon: Building2 },
        { title: "Role assignment", description: "ERP roles and permissions aligned with job responsibilities.", icon: ShieldCheck },
        { title: "Documents", description: "Identity, address, employment and compliance documents.", icon: FileBadge },
        { title: "Joining & status", description: "Joining dates, probation, activation and separation history.", icon: CalendarClock },
        { title: "Audit readiness", description: "Traceable changes to assignments and access privileges.", icon: BadgeCheck },
      ]}
    />
  );
}
