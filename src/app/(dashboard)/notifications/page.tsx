import { BatteryWarning, BellRing, FileWarning, IndianRupee, ShieldAlert, Wrench } from "lucide-react";
import { ModuleFoundation } from "@/components/operations/module-foundation";

export default function NotificationsPage() {
  return (
    <ModuleFoundation
      title="Notifications"
      description="Prioritized operational alerts, reminders and assigned follow-ups."
      eyebrow="Alert catalogue"
      actionLabel="Review alert rules"
      items={[
        { title: "Payment overdue", description: "Customers requiring collection follow-up based on ageing rules.", icon: IndianRupee, status: "Critical" },
        { title: "Return overdue", description: "Active rentals that have passed their planned return time.", icon: ShieldAlert, status: "Critical" },
        { title: "Service due", description: "Vehicles approaching scheduled maintenance thresholds.", icon: Wrench, status: "High" },
        { title: "Low battery", description: "Available or returning vehicles below the readiness threshold.", icon: BatteryWarning, status: "High" },
        { title: "Documents expiring", description: "Customer and vehicle documents expiring within the configured period.", icon: FileWarning, status: "Medium" },
        { title: "Assigned tasks", description: "Personal reminders for inspections, verification and collection work.", icon: BellRing, status: "Action" },
      ]}
    />
  );
}
