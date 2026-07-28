import { Building2, GitBranch, KeyRound, ListTree, ReceiptText, ShieldCheck } from "lucide-react";
import { ModuleFoundation } from "@/components/operations/module-foundation";

export default function SettingsPage() {
  return (
    <ModuleFoundation
      title="Settings"
      description="Company structure, access control and operational master data."
      eyebrow="Platform foundation"
      actionLabel="Review configuration"
      items={[
        { title: "Company profile", description: "Legal identity, invoicing details, currency and business preferences.", icon: Building2 },
        { title: "Branches", description: "Operating locations, branch managers and local assignment rules.", icon: GitBranch },
        { title: "Roles & permissions", description: "Role-based access for administrators, managers and operations staff.", icon: ShieldCheck },
        { title: "Lookup values", description: "Controlled statuses, document types, service categories and reference data.", icon: ListTree },
        { title: "Number sequences", description: "Consistent customer, booking, rental, payment and invoice identifiers.", icon: ReceiptText },
        { title: "Security", description: "Session policy, protected actions and company or branch isolation.", icon: KeyRound },
      ]}
    />
  );
}
