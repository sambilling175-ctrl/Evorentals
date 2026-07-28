"use client";

import { CalendarCheck, CircleCheckBig, Clock3, IndianRupee } from "lucide-react";
import { OperationsPage } from "@/components/operations/operations-page";
import { bookings, compactTrend } from "@/data/operations";

export default function BookingsPage() {
  return (
    <OperationsPage
      title="Bookings"
      description="Reserve available vehicles and convert confirmed demand into rentals."
      actionLabel="New booking"
      metrics={[
        { title: "Today’s Bookings", value: "18", change: 12, changeType: "increase", icon: CalendarCheck, color: "blue", trend: compactTrend },
        { title: "Confirmed", value: "14", change: 8, changeType: "increase", icon: CircleCheckBig, color: "green", trend: compactTrend },
        { title: "Awaiting Action", value: "4", change: 2, changeType: "decrease", icon: Clock3, color: "orange", trend: [...compactTrend].reverse() },
        { title: "Booking Value", value: "₹86,420", change: 9.4, changeType: "increase", icon: IndianRupee, color: "purple", trend: compactTrend },
      ]}
      records={bookings}
      listTitle="Booking pipeline"
      insightTitle="Availability snapshot"
      tabs={["All bookings", "Pending", "Confirmed", "Upcoming", "Cancelled"]}
      insights={[
        { label: "Available now", value: "98", note: "Across all branches", color: "bg-emerald-500" },
        { label: "Returning today", value: "26", note: "8 ready after inspection", color: "bg-blue-500" },
        { label: "Unassigned bookings", value: "4", note: "Vehicle selection required", color: "bg-orange-500" },
        { label: "Deposit pending", value: "6", note: "₹18,000 expected", color: "bg-purple-500" },
      ]}
    />
  );
}
