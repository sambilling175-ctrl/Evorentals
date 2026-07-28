"use client";

import { ClipboardCheck, PackageOpen, TimerReset, Wrench } from "lucide-react";
import { OperationsPage } from "@/components/operations/operations-page";
import { compactTrend, serviceJobs } from "@/data/operations";

export default function ServicePage() {
  return (
    <OperationsPage
      title="Service & Maintenance"
      description="Vehicle service pipeline, readiness and turnaround visibility."
      actionLabel="Create service request"
      metrics={[
        { title: "Under Service", value: "38", change: 3, changeType: "decrease", icon: Wrench, color: "orange", trend: [...compactTrend].reverse() },
        { title: "In Inspection", value: "22", change: 4, changeType: "increase", icon: ClipboardCheck, color: "purple", trend: compactTrend },
        { title: "Waiting for Parts", value: "12", change: 2, changeType: "decrease", icon: PackageOpen, color: "cyan", trend: [...compactTrend].reverse() },
        { title: "Avg. Turnaround", value: "1.6 days", change: 15.8, changeType: "decrease", icon: TimerReset, color: "green", trend: [...compactTrend].reverse() },
      ]}
      records={serviceJobs}
      listTitle="Recent service jobs"
      insightTitle="Service pipeline"
      tabs={["Dashboard", "Requests", "Job cards", "QC check", "History"]}
      insights={[
        { label: "Returned", value: "28", note: "Awaiting initial inspection", color: "bg-blue-500" },
        { label: "In service", value: "38", note: "Across four service centers", color: "bg-orange-500" },
        { label: "Waiting for parts", value: "12", note: "5 delayed over two days", color: "bg-purple-500" },
        { label: "Ready to deploy", value: "48", note: "QC and cleaning complete", color: "bg-emerald-500" },
      ]}
    />
  );
}
