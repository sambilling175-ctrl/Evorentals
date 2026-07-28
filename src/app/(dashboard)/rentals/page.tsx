"use client";

import { ClockAlert, KeyRound, RotateCcw, WalletCards } from "lucide-react";
import { OperationsPage } from "@/components/operations/operations-page";
import { compactTrend, rentals } from "@/data/operations";

export default function RentalsPage() {
  return (
    <OperationsPage
      title="Rental Operations"
      description="Start, extend, return and settle every active rental."
      actionLabel="Create rental"
      metrics={[
        { title: "Active Rentals", value: "432", change: 3.2, changeType: "increase", icon: KeyRound, color: "green", trend: compactTrend },
        { title: "Due Today", value: "26", change: 4, changeType: "increase", icon: RotateCcw, color: "blue", trend: compactTrend },
        { title: "Overdue Returns", value: "11", change: 2, changeType: "decrease", icon: ClockAlert, color: "red", trend: [...compactTrend].reverse() },
        { title: "Open Balance", value: "₹2.45L", change: 5.2, changeType: "decrease", icon: WalletCards, color: "purple", trend: [...compactTrend].reverse() },
      ]}
      records={rentals}
      listTitle="Rental control board"
      insightTitle="Today’s operations"
      tabs={["Active", "Due today", "Overdue", "Returned", "Settled"]}
      insights={[
        { label: "Starts scheduled", value: "14", note: "4 awaiting payment", color: "bg-blue-500" },
        { label: "Returns scheduled", value: "26", note: "6 inspections assigned", color: "bg-purple-500" },
        { label: "Extensions requested", value: "8", note: "Pricing review required", color: "bg-orange-500" },
        { label: "Ready to settle", value: "12", note: "All inspections complete", color: "bg-emerald-500" },
      ]}
    />
  );
}


