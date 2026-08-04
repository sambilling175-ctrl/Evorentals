import { createClient } from "@/lib/supabase/server";

export type KycStatus = "pending" | "verified" | "rejected" | "expired";

export interface CustomerSummary {
  id: string;
  customerNumber: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  kycStatus: KycStatus;
  status: string;
  createdAt: string;
}

export interface CustomerDetail extends CustomerSummary {
  dateOfBirth: string | null;
  emergencyContact: string | null;
  licenseNumber: string | null;
  addresses: Array<{
    id: string;
    addressType: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pinCode: string;
    isPrimary: boolean;
  }>;
  documents: Array<{
    id: string;
    documentType: string;
    documentNumber: string | null;
    fileName: string;
    expiresOn: string | null;
    status: KycStatus;
    createdAt: string;
  }>;
  reviews: Array<{
    id: string;
    status: KycStatus;
    notes: string | null;
    reviewedAt: string;
  }>;
  timeline: Array<{
    id: string;
    eventType: string;
    summary: string;
    occurredAt: string;
  }>;
}

function mapCustomer(row: Record<string, unknown>): CustomerSummary {
  return {
    id: String(row.id),
    customerNumber: String(row.customer_number),
    fullName: String(row.full_name),
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    kycStatus: row.kyc_status as KycStatus,
    status: String(row.status),
    createdAt: String(row.created_at),
  };
}

export async function listCustomers(): Promise<CustomerSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id,customer_number,full_name,email,phone,kyc_status,status,created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load customers: ${error.message}`);
  return (data ?? []).map((row) => mapCustomer(row));
}

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const supabase = await createClient();
  const [customerResult, addressesResult, documentsResult, reviewsResult, timelineResult] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
    supabase.from("customer_addresses").select("*").eq("customer_id", id).order("is_primary", { ascending: false }),
    supabase.from("customer_documents").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("kyc_reviews").select("*").eq("customer_id", id).order("reviewed_at", { ascending: false }),
    supabase.from("customer_timeline_events").select("id,event_type,summary,occurred_at").eq("customer_id", id).order("occurred_at", { ascending: false }),
  ]);
  if (customerResult.error) throw new Error(customerResult.error.message);
  if (!customerResult.data) return null;
  for (const result of [addressesResult, documentsResult, reviewsResult, timelineResult]) {
    if (result.error) throw new Error(result.error.message);
  }
  const base = mapCustomer(customerResult.data);
  return {
    ...base,
    dateOfBirth: customerResult.data.date_of_birth,
    emergencyContact: customerResult.data.emergency_contact,
    licenseNumber: customerResult.data.license_number,
    addresses: (addressesResult.data ?? []).map((row) => ({
      id: row.id, addressType: row.address_type, line1: row.line_1, line2: row.line_2,
      city: row.city, state: row.state, pinCode: row.pin_code, isPrimary: row.is_primary,
    })),
    documents: (documentsResult.data ?? []).map((row) => ({
      id: row.id, documentType: row.document_type, documentNumber: row.document_number,
      fileName: row.file_name, expiresOn: row.expires_on, status: row.status, createdAt: row.created_at,
    })),
    reviews: (reviewsResult.data ?? []).map((row) => ({
      id: row.id, status: row.status, notes: row.notes, reviewedAt: row.reviewed_at,
    })),
    timeline: (timelineResult.data ?? []).map((row) => ({
      id: row.id, eventType: row.event_type, summary: row.summary, occurredAt: row.occurred_at,
    })),
  };
}
