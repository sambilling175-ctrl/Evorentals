import { BadgeIndianRupee, Bike, FileDown, KeyRound, Users, WalletCards } from "lucide-react";
import { ModuleFoundation } from "@/components/operations/module-foundation";

export default function ReportsPage() {
  return (
    <ModuleFoundation
      title="Reports & Analytics"
      description="Operational reports prepared for branch, period and status filtering."
      eyebrow="Reporting catalogue"
      actionLabel="Export dashboard summary"
      items={[
        { title: "Rental report", description: "Starts, extensions, returns, overdue contracts and settlement status.", icon: KeyRound },
        { title: "Fleet report", description: "Availability, utilization, battery readiness and service downtime.", icon: Bike },
        { title: "Customer report", description: "Customer growth, KYC readiness, activity and outstanding balances.", icon: Users },
        { title: "Collections report", description: "Daily receipts, collector performance and overdue ageing.", icon: WalletCards },
        { title: "Revenue report", description: "Rental income, adjustments, refunds and branch-level performance.", icon: BadgeIndianRupee },
        { title: "Export centre", description: "Reusable CSV exports with consistent filters and audit context.", icon: FileDown },
      ]}
    />
  );
}
