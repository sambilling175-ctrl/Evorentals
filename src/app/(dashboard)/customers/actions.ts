"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const customerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().trim().email().optional().or(z.literal("")),
  licenseNumber: z.string().trim().max(40).optional(),
  dateOfBirth: z.string().optional(),
  emergencyContact: z.string().trim().max(20).optional(),
  line1: z.string().trim().min(3).max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pinCode: z.string().trim().regex(/^\d{6}$/, "Enter a valid PIN code"),
});

async function getActor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  const { data: profile, error } = await supabase
    .from("profiles").select("id,company_id").eq("id", user.id).single();
  if (error || !profile) throw new Error("Active employee profile required");
  return { supabase, user, profile };
}

export async function createCustomer(formData: FormData) {
  const values = customerSchema.parse(Object.fromEntries(formData));
  const { supabase, user, profile } = await getActor();
  const customerNumber = `EV-C${Date.now().toString().slice(-8)}`;
  const { data: customer, error } = await supabase.from("customers").insert({
    company_id: profile.company_id,
    customer_number: customerNumber,
    full_name: values.fullName,
    phone: values.phone,
    email: values.email || null,
    license_number: values.licenseNumber || null,
    date_of_birth: values.dateOfBirth || null,
    emergency_contact: values.emergencyContact || null,
    created_by: user.id,
    updated_by: user.id,
  }).select("id").single();
  if (error) throw new Error(error.message);

  const { error: addressError } = await supabase.from("customer_addresses").insert({
    company_id: profile.company_id,
    customer_id: customer.id,
    address_type: "home",
    line_1: values.line1,
    line_2: values.line2 || null,
    city: values.city,
    state: values.state,
    pin_code: values.pinCode,
    is_primary: true,
  });
  if (addressError) throw new Error(addressError.message);

  const file = formData.get("document");
  const documentType = String(formData.get("documentType") ?? "");
  if (file instanceof File && file.size > 0 && documentType) {
    if (file.size > 5 * 1024 * 1024) throw new Error("Document must be 5 MB or smaller");
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) throw new Error("Only PDF, JPG, and PNG files are allowed");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${profile.company_id}/${customer.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("customer-documents").upload(path, file);
    if (uploadError) throw new Error(uploadError.message);
    const { error: documentError } = await supabase.from("customer_documents").insert({
      company_id: profile.company_id,
      customer_id: customer.id,
      document_type: documentType,
      document_number: String(formData.get("documentNumber") ?? "") || null,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type,
      expires_on: String(formData.get("expiresOn") ?? "") || null,
      uploaded_by: user.id,
    });
    if (documentError) throw new Error(documentError.message);
  }
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function reviewKyc(customerId: string, formData: FormData) {
  const status = z.enum(["verified", "rejected"]).parse(formData.get("status"));
  const notes = z.string().trim().max(1000).parse(formData.get("notes") ?? "");
  const { supabase, user, profile } = await getActor();
  const { error: reviewError } = await supabase.from("kyc_reviews").insert({
    company_id: profile.company_id, customer_id: customerId, status, notes: notes || null, reviewed_by: user.id,
  });
  if (reviewError) throw new Error(reviewError.message);
  const { error: customerError } = await supabase.from("customers").update({
    kyc_status: status, updated_by: user.id,
  }).eq("id", customerId);
  if (customerError) throw new Error(customerError.message);
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
}
