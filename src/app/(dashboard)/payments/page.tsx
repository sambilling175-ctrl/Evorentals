"use client";

import { BadgeIndianRupee, CircleGauge, HandCoins, TriangleAlert } from "lucide-react";
import { OperationsPage } from "@/components/operations/operations-page";
import { collections, compactTrend } from "@/data/operations";

export default function PaymentsPage() {
  return (
    <OperationsPage
      title="Rent Collections"
      description="Collection performance, pending dues and settlement activity."
      actionLabel="Record collection"
      metrics={[
        { title: "Collected This Month", value: "₹12.45L", change: 18.6, changeType: "increase", icon: HandCoins, color: "green", trend: compactTrend },
        { title: "Collected Today", value: "₹1.56L", change: 12.4, changeType: "increase", icon: BadgeIndianRupee, color: "blue", trend: compactTrend },
        { title: "Pending Dues", value: "₹2.45L", change: 5.2, changeType: "decrease", icon: TriangleAlert, color: "purple", trend: [...compactTrend].reverse() },
        { title: "Collection Efficiency", value: "92.4%", change: 6.2, changeType: "increase", icon: CircleGauge, color: "cyan", trend: compactTrend },
      ]}
      records={collections}
      listTitle="Collection activity"
      insightTitle="Dues ageing"
      tabs={["Overview", "Today", "Pending dues", "Overdue", "Refunds"]}
      insights={[
        { label: "0–7 days", value: "₹85,450", note: "35% of total dues", color: "bg-emerald-500" },
        { label: "8–15 days", value: "₹62,300", note: "25% of total dues", color: "bg-blue-500" },
        { label: "16–30 days", value: "₹54,800", note: "22% of total dues", color: "bg-orange-500" },
        { label: "30+ days", value: "₹43,310", note: "18% requires action", color: "bg-red-500" },
      ]}
    />
  );
}


