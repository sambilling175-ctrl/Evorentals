import { notFound } from "next/navigation";
import { reviewKyc } from "../actions";
import { getCustomer } from "@/lib/services/customers";
import { CustomerEditDialog } from "@/components/customers/customer-edit-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();
  const reviewAction = reviewKyc.bind(null, customer.id);

  return <div className="space-y-4">
    <PageHeader title={customer.fullName} description={`${customer.customerNumber} · ${customer.phone ?? "No phone"}`}>
      <CustomerEditDialog customer={customer} />
      <StatusBadge status={customer.kycStatus} />
    </PageHeader>
    <div className="grid gap-4 xl:grid-cols-3">
      <Card><CardHeader><CardTitle className="text-base">Customer profile</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><Detail label="Email" value={customer.email} /><Detail label="Driving licence" value={customer.licenseNumber} /><Detail label="Date of birth" value={customer.dateOfBirth} /><Detail label="Emergency contact" value={customer.emergencyContact} /></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Addresses</CardTitle></CardHeader><CardContent className="space-y-3">{customer.addresses.map((address) => <div key={address.id} className="rounded-lg border p-3 text-sm"><p className="font-semibold capitalize">{address.addressType}{address.isPrimary ? " · Primary" : ""}</p><p className="mt-1 text-muted-foreground">{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}, {address.state} {address.pinCode}</p></div>)}{customer.addresses.length === 0 && <p className="text-sm text-muted-foreground">No address recorded.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">KYC decision</CardTitle></CardHeader><CardContent><form action={reviewAction} className="space-y-3"><div className="space-y-2"><Label htmlFor="notes">Review notes</Label><Textarea id="notes" name="notes" placeholder="Record verification notes…" /></div><div className="flex gap-2"><Button name="status" value="verified" className="flex-1">Verify KYC</Button><Button name="status" value="rejected" variant="destructive" className="flex-1">Reject</Button></div></form></CardContent></Card>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader><CardContent className="space-y-2">{customer.documents.map((document) => <div key={document.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-semibold capitalize">{document.documentType.replace("_", " ")}</p><p className="text-xs text-muted-foreground">{document.fileName}{document.documentNumber ? ` · ${document.documentNumber}` : ""}</p></div><StatusBadge status={document.status} /></div>)}{customer.documents.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">KYC history</CardTitle></CardHeader><CardContent className="space-y-2">{customer.reviews.map((review) => <div key={review.id} className="rounded-lg border p-3"><div className="flex items-center justify-between"><StatusBadge status={review.status} /><time className="text-xs text-muted-foreground">{new Date(review.reviewedAt).toLocaleString("en-IN")}</time></div>{review.notes && <p className="mt-2 text-sm text-muted-foreground">{review.notes}</p>}</div>)}{customer.reviews.length === 0 && <p className="text-sm text-muted-foreground">No KYC review recorded.</p>}</CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className="text-base">Customer timeline</CardTitle></CardHeader><CardContent className="space-y-2">{customer.timeline.map((event) => <div key={event.id} className="flex items-start justify-between gap-4 rounded-lg border p-3"><div><p className="text-sm font-semibold">{event.summary}</p><p className="text-xs capitalize text-muted-foreground">{event.eventType.replaceAll("_", " ")}</p></div><time className="whitespace-nowrap text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString("en-IN")}</time></div>)}{customer.timeline.length === 0 && <p className="text-sm text-muted-foreground">No profile changes recorded yet.</p>}</CardContent></Card>
  </div>;
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="font-medium">{value || "Not provided"}</p></div>;
}
