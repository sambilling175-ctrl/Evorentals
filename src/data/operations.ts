export type OperationalStatus =
  | "active"
  | "available"
  | "pending"
  | "overdue"
  | "reserved"
  | "maintenance"
  | "completed"
  | "paid"
  | "partial";

export interface OperationsRecord {
  id: string;
  primary: string;
  secondary: string;
  context: string;
  amount?: string;
  status: OperationalStatus;
}

export const customers: OperationsRecord[] = [
  { id: "EV-C1048", primary: "Ravi Kumar", secondary: "+91 98765 43210", context: "KYC verified · 4 rentals", amount: "₹1,999 due", status: "active" },
  { id: "EV-C1047", primary: "Anil Sharma", secondary: "+91 99887 22110", context: "KYC verified · 2 rentals", amount: "₹7,200 due", status: "overdue" },
  { id: "EV-C1046", primary: "Sanjay Patel", secondary: "+91 98980 11223", context: "Documents under review", status: "pending" },
  { id: "EV-C1045", primary: "Meena Yadav", secondary: "+91 97654 88901", context: "KYC verified · 7 rentals", amount: "No dues", status: "active" },
  { id: "EV-C1044", primary: "Vikas Singh", secondary: "+91 98111 77550", context: "Driving licence expires in 12 days", status: "pending" },
];

export const fleet: OperationsRecord[] = [
  { id: "EV1234", primary: "BGauss C12", secondary: "KA 01 EV 1234", context: "78% battery · 12,486 km", amount: "Koramangala", status: "active" },
  { id: "EV1235", primary: "BGauss C12", secondary: "KA 01 EV 1235", context: "92% battery · 8,210 km", amount: "Indiranagar", status: "available" },
  { id: "EV1236", primary: "Ather 450X", secondary: "KA 03 EV 8812", context: "64% battery · 16,540 km", amount: "HSR Layout", status: "reserved" },
  { id: "EV1237", primary: "TVS iQube", secondary: "KA 05 EV 7120", context: "Controller inspection", amount: "Main Garage", status: "maintenance" },
  { id: "EV1238", primary: "Ather 450S", secondary: "KA 01 EV 9821", context: "86% battery · 6,441 km", amount: "Whitefield", status: "available" },
];

export const bookings: OperationsRecord[] = [
  { id: "BK-250728-018", primary: "Vikram Singh", secondary: "BGauss C12 · EV1234", context: "29 Jul – 05 Aug · Weekly", amount: "₹1,999", status: "active" },
  { id: "BK-250728-017", primary: "Rahul Sharma", secondary: "Ather 450X · EV1236", context: "30 Jul – 06 Aug · Weekly", amount: "₹2,399", status: "reserved" },
  { id: "BK-250728-016", primary: "Amit Kumar", secondary: "Vehicle assignment pending", context: "30 Jul – 30 Aug · Monthly", amount: "₹7,499", status: "pending" },
  { id: "BK-250727-015", primary: "Deepak Verma", secondary: "TVS iQube · EV1198", context: "27 Jul – 27 Aug · Monthly", amount: "₹6,999", status: "completed" },
];

export const rentals: OperationsRecord[] = [
  { id: "RT-2507-2234", primary: "Vikram Singh", secondary: "EV1234 · BGauss C12", context: "Day 5 of 7 · return 30 Jul", amount: "₹1,999", status: "active" },
  { id: "RT-2507-2219", primary: "Ravi Kumar", secondary: "EV1210 · BGauss C12", context: "Day 24 of 30 · return 03 Aug", amount: "₹7,499", status: "active" },
  { id: "RT-2507-2204", primary: "Anil Sharma", secondary: "EV1187 · Ather 450X", context: "Return overdue by 2 days", amount: "₹7,200 due", status: "overdue" },
  { id: "RT-2507-2188", primary: "Meena Yadav", secondary: "EV1140 · TVS iQube", context: "Returned · inspection complete", amount: "₹850 refund", status: "completed" },
];

export const collections: OperationsRecord[] = [
  { id: "RC-72831", primary: "Ravi Kumar", secondary: "UPI · UTR 882914", context: "Collected today at 10:30 AM", amount: "₹1,999", status: "paid" },
  { id: "RC-72830", primary: "Anil Sharma", secondary: "Rental RT-2507-2204", context: "35 days overdue", amount: "₹8,650", status: "overdue" },
  { id: "RC-72829", primary: "Suresh Patel", secondary: "Cash · receipt issued", context: "Collected today at 10:05 AM", amount: "₹1,999", status: "paid" },
  { id: "RC-72828", primary: "Vikas Singh", secondary: "Rental RT-2507-2190", context: "Partial payment · ₹3,000 remaining", amount: "₹4,499", status: "partial" },
  { id: "RC-72827", primary: "Mohit Yadav", secondary: "Rental RT-2507-2166", context: "26 days overdue", amount: "₹5,850", status: "overdue" },
];

export const serviceJobs: OperationsRecord[] = [
  { id: "JC2505271", primary: "EV1234 · BGauss C12", secondary: "Motor service", context: "Assigned to Main Garage · due 29 Jul", amount: "1.8 days", status: "maintenance" },
  { id: "JC2505270", primary: "EV1201 · BGauss C12", secondary: "General inspection", context: "Assigned to City Garage · due today", amount: "0.8 days", status: "pending" },
  { id: "JC2505269", primary: "EV1187 · Ather 450X", secondary: "Controller issue", context: "Waiting for controller assembly", amount: "2.2 days", status: "overdue" },
  { id: "JC2505268", primary: "EV1155 · TVS iQube", secondary: "Full service", context: "QC check in progress", amount: "1.2 days", status: "pending" },
];

export const compactTrend = [42, 48, 46, 57, 53, 64, 61, 72, 68, 79, 74, 86];
