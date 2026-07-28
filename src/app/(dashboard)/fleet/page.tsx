"use client";

import { BatteryCharging, Bike, CircleCheckBig, Wrench } from "lucide-react";
import { OperationsPage } from "@/components/operations/operations-page";
import { compactTrend, fleet } from "@/data/operations";

export default function FleetPage() {
  return (
    <OperationsPage
      title="Fleet Management"
      description="Live vehicle readiness, battery health and assignment status."
      actionLabel="Register vehicle"
      metrics={[
        { title: "Total Fleet", value: "586", change: 1.4, changeType: "increase", icon: Bike, color: "blue", trend: compactTrend },
        { title: "Available", value: "98", change: 6, changeType: "decrease", icon: CircleCheckBig, color: "green", trend: [...compactTrend].reverse() },
        { title: "On Rent", value: "432", change: 2.9, changeType: "increase", icon: BatteryCharging, color: "purple", trend: compactTrend },
        { title: "Under Service", value: "38", change: 3, changeType: "decrease", icon: Wrench, color: "orange", trend: [...compactTrend].reverse() },
      ]}
      records={fleet}
      listTitle="Fleet readiness"
      insightTitle="Fleet alerts"
      tabs={["All vehicles", "Available", "On rent", "Reserved", "Service"]}
      insights={[
        { label: "Service due", value: "18", note: "Within the next 7 days", color: "bg-orange-500" },
        { label: "Low battery", value: "12", note: "Below 30% charge", color: "bg-red-500" },
        { label: "Documents expiring", value: "9", note: "Insurance or registration", color: "bg-purple-500" },
        { label: "Fleet utilization", value: "73.7%", note: "2.9% above last week", color: "bg-emerald-500" },
      ]}
    />
  );
}


