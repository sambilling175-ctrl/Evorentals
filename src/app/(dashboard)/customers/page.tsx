"use client";

import { BadgeCheck, Clock3, ShieldAlert, Users } from "lucide-react";
import { OperationsPage } from "@/components/operations/operations-page";
import { compactTrend, customers } from "@/data/operations";

export default function CustomersPage() {
  return (
    <OperationsPage
      title="Customers"
      description="Customer profiles, KYC readiness and rental relationships."
      actionLabel="Add customer"
      metrics={[
        { title: "Total Customers", value: "1,248", change: 2.8, changeType: "increase", icon: Users, color: "cyan", trend: compactTrend },
        { title: "KYC Verified", value: "1,106", change: 4.2, changeType: "increase", icon: BadgeCheck, color: "green", trend: compactTrend },
        { title: "KYC Pending", value: "42", change: 8, changeType: "decrease", icon: Clock3, color: "orange", trend: [...compactTrend].reverse() },
        { title: "Documents Expiring", value: "19", change: 3, changeType: "increase", icon: ShieldAlert, color: "red", trend: compactTrend },
      ]}
      records={customers}
      listTitle="Customer directory"
      insightTitle="KYC attention"
      tabs={["All customers", "KYC pending", "Active rentals", "Overdue"]}
      insights={[
        { label: "KYC awaiting review", value: "12", note: "Oldest request is 18 hours", color: "bg-amber-500" },
        { label: "Documents expiring", value: "19", note: "Within the next 30 days", color: "bg-red-500" },
        { label: "New this month", value: "34", note: "12.4% above last month", color: "bg-emerald-500" },
        { label: "Customers with dues", value: "68", note: "₹2.45L outstanding", color: "bg-purple-500" },
      ]}
    />
  );
}


