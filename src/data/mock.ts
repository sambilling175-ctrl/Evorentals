import type { ActivityItem } from "@/types";

// ─── Revenue Trend (12 months) ───────────────────────────────────
export const revenueData = [
  { month: "Jan", revenue: 820000, expenses: 540000 },
  { month: "Feb", revenue: 950000, expenses: 580000 },
  { month: "Mar", revenue: 1100000, expenses: 620000 },
  { month: "Apr", revenue: 980000, expenses: 600000 },
  { month: "May", revenue: 1250000, expenses: 680000 },
  { month: "Jun", revenue: 1180000, expenses: 660000 },
  { month: "Jul", revenue: 1350000, expenses: 720000 },
  { month: "Aug", revenue: 1420000, expenses: 750000 },
  { month: "Sep", revenue: 1280000, expenses: 700000 },
  { month: "Oct", revenue: 1500000, expenses: 780000 },
  { month: "Nov", revenue: 1380000, expenses: 740000 },
  { month: "Dec", revenue: 1240000, expenses: 710000 },
];

// ─── Fleet Utilization by Model ──────────────────────────────────
export const fleetUtilizationData = [
  { model: "Ather 450X", utilization: 85 },
  { model: "Ola S1 Pro", utilization: 78 },
  { model: "TVS iQube", utilization: 72 },
  { model: "Bajaj CE", utilization: 68 },
  { model: "Hero Vida", utilization: 65 },
  { model: "Revolt RV", utilization: 58 },
];

// ─── Rental Distribution ─────────────────────────────────────────
export const rentalDistribution = [
  { name: "Daily", value: 45 },
  { name: "Weekly", value: 28 },
  { name: "Monthly", value: 18 },
  { name: "Hourly", value: 9 },
];

// ─── KPI Sparkline Data ──────────────────────────────────────────
export const vehicleSparkline = [180, 195, 210, 205, 220, 215, 230, 225, 240, 235, 242, 248];
export const rentalSparkline = [120, 135, 150, 140, 160, 155, 170, 168, 175, 180, 182, 186];
export const revenueSparkline = [82, 95, 110, 98, 125, 118, 135, 142, 128, 150, 138, 124];
export const utilizationSparkline = [65, 68, 70, 72, 71, 73, 74, 73, 75, 74, 75, 74.8];

// ─── Recent Rentals Table ────────────────────────────────────────
export const recentRentals = [
  {
    id: "RNT-001",
    customer: "Priya Sharma",
    vehicle: "Ather 450X",
    vehicleNo: "KA-01-EV-1234",
    startDate: "2026-07-10",
    endDate: "2026-07-12",
    plan: "Daily",
    amount: 1200,
    status: "active",
  },
  {
    id: "RNT-002",
    customer: "Rahul Mehta",
    vehicle: "Ola S1 Pro",
    vehicleNo: "KA-01-EV-5678",
    startDate: "2026-07-08",
    endDate: "2026-07-15",
    plan: "Weekly",
    amount: 5500,
    status: "active",
  },
  {
    id: "RNT-003",
    customer: "Ananya Reddy",
    vehicle: "TVS iQube",
    vehicleNo: "KA-01-EV-9012",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    plan: "Monthly",
    amount: 18000,
    status: "active",
  },
  {
    id: "RNT-004",
    customer: "Vikram Singh",
    vehicle: "Ather 450X",
    vehicleNo: "KA-01-EV-3456",
    startDate: "2026-07-05",
    endDate: "2026-07-07",
    plan: "Daily",
    amount: 1200,
    status: "completed",
  },
  {
    id: "RNT-005",
    customer: "Meera Iyer",
    vehicle: "Hero Vida V1",
    vehicleNo: "KA-01-EV-7890",
    startDate: "2026-07-09",
    endDate: "2026-07-11",
    plan: "Daily",
    amount: 900,
    status: "overdue",
  },
  {
    id: "RNT-006",
    customer: "Aditya Joshi",
    vehicle: "Bajaj Chetak",
    vehicleNo: "KA-01-EV-2345",
    startDate: "2026-07-11",
    endDate: "2026-07-12",
    plan: "Daily",
    amount: 800,
    status: "pending",
  },
  {
    id: "RNT-007",
    customer: "Kavitha Nair",
    vehicle: "Revolt RV400",
    vehicleNo: "KA-01-EV-6789",
    startDate: "2026-07-06",
    endDate: "2026-07-08",
    plan: "Daily",
    amount: 1100,
    status: "completed",
  },
  {
    id: "RNT-008",
    customer: "Sanjay Patel",
    vehicle: "Ola S1 Pro",
    vehicleNo: "KA-01-EV-0123",
    startDate: "2026-07-03",
    endDate: "2026-07-10",
    plan: "Weekly",
    amount: 5500,
    status: "cancelled",
  },
];

// ─── Activity Feed ───────────────────────────────────────────────
export const recentActivities: ActivityItem[] = [
  {
    id: "1",
    user: { name: "Priya Sharma" },
    action: "booked",
    target: "Ather 450X (KA-01-EV-1234)",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    type: "booking",
  },
  {
    id: "2",
    user: { name: "System" },
    action: "flagged overdue return for",
    target: "Hero Vida V1 (RNT-005)",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    type: "system",
  },
  {
    id: "3",
    user: { name: "Arjun Kumar" },
    action: "received payment of ₹5,500 from",
    target: "Rahul Mehta",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    type: "payment",
  },
  {
    id: "4",
    user: { name: "Deepak R" },
    action: "completed service for",
    target: "TVS iQube (KA-01-EV-4567)",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    type: "service",
  },
  {
    id: "5",
    user: { name: "Suresh M" },
    action: "added new vehicle",
    target: "Ather 450X (KA-01-EV-8901)",
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    type: "vehicle",
  },
  {
    id: "6",
    user: { name: "Priya Sharma" },
    action: "registered as new customer",
    target: "",
    timestamp: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    type: "customer",
  },
];
