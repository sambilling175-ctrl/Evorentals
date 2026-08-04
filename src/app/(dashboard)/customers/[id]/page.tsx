import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileCheck2,
  FileText,
  Home,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { reviewKyc, viewCustomerDocument } from "../actions";
import { getCustomer } from "@/lib/services/customers";
import { CustomerEditDialog } from "@/components/customers/customer-edit-dialog";
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
  const initials = customer.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CU";

  return <div className="space-y-5">
    <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit gap-2 text-muted-foreground"><Link href="/customers"><ArrowLeft className="h-4 w-4" />Customer directory</Link></Button>

    <section className="overflow-hidden rounded-xl border border-border/80 bg-card/90 shadow-[0_18px_50px_-36px_rgba(37,99,235,0.7)]">
      <div className="h-20 bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.28),transparent_38%),linear-gradient(110deg,rgba(37,99,235,0.18),rgba(15,23,42,0.02))]" />
      <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-end gap-4">
          <div className="-mt-8 grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-4 border-card bg-gradient-to-br from-blue-500 to-cyan-500 text-xl font-bold text-white shadow-lg">{initials}</div>
          <div className="min-w-0 pb-1"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-2xl font-bold tracking-tight">{customer.fullName}</h1><StatusBadge status={customer.kycStatus} /></div><p className="mt-1 font-mono text-xs text-muted-foreground">{customer.customerNumber} · Account {customer.status}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={customer.status} /><CustomerEditDialog customer={customer} /></div>
      </div>
    </section>

    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
      <div className="space-y-4">
        <Card className="border-border/80 bg-card/90"><CardHeader className="border-b border-border/70 p-4"><CardTitle className="flex items-center gap-2 text-base"><UserRound className="h-4 w-4 text-blue-500" />Customer information</CardTitle></CardHeader><CardContent className="grid gap-0 p-0 sm:grid-cols-2">
          <Detail icon={Phone} label="Mobile number" value={customer.phone} />
          <Detail icon={Mail} label="Email address" value={customer.email} />
          <Detail icon={FileCheck2} label="Driving licence" value={customer.licenseNumber} />
          <Detail icon={CalendarDays} label="Date of birth" value={customer.dateOfBirth ? formatDate(customer.dateOfBirth) : null} />
          <Detail icon={Phone} label="Emergency contact" value={customer.emergencyContact} />
          <Detail icon={Clock3} label="Customer since" value={formatDate(customer.createdAt)} />
        </CardContent></Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-border/80 bg-card/90"><CardHeader className="border-b border-border/70 p-4"><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4 text-cyan-500" />Addresses</CardTitle></CardHeader><CardContent className="space-y-3 p-4">{customer.addresses.map((address) => <div key={address.id} className="rounded-xl border border-border/70 bg-muted/15 p-3 text-sm"><div className="flex items-center gap-2"><Home className="h-4 w-4 text-muted-foreground" /><p className="font-semibold capitalize">{address.addressType}</p>{address.isPrimary && <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-500">Primary</span>}</div><p className="mt-2 leading-5 text-muted-foreground">{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}, {address.state} {address.pinCode}</p></div>)}{customer.addresses.length === 0 && <EmptyText>No address recorded.</EmptyText>}</CardContent></Card>

          <Card className="border-border/80 bg-card/90"><CardHeader className="border-b border-border/70 p-4"><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-purple-500" />KYC documents <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{customer.documents.length}</span></CardTitle></CardHeader><CardContent className="space-y-2 p-4">{customer.documents.map((document) => { const viewAction = viewCustomerDocument.bind(null, customer.id, document.id); return <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/15 p-3"><div className="min-w-0"><p className="text-sm font-semibold capitalize">{document.documentType.replaceAll("_", " ")}</p><p className="truncate text-xs text-muted-foreground">{document.fileName}{document.documentNumber ? ` · ${document.documentNumber}` : ""}</p>{document.expiresOn && <p className="mt-1 text-[11px] text-muted-foreground">Expires {formatDate(document.expiresOn)}</p>}</div><div className="flex shrink-0 items-center gap-2"><StatusBadge status={document.status} /><form action={viewAction}><Button type="submit" size="sm" variant="outline">View</Button></form></div></div>; })}{customer.documents.length === 0 && <EmptyText>No documents uploaded.</EmptyText>}</CardContent></Card>
        </div>

        <Card className="border-border/80 bg-card/90"><CardHeader className="border-b border-border/70 p-4"><CardTitle className="text-base">Customer timeline</CardTitle></CardHeader><CardContent className="p-4">{customer.timeline.length > 0 ? <ol className="relative ml-2 space-y-5 border-l border-border pl-5">{customer.timeline.map((event) => <li key={event.id} className="relative"><span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-blue-500 ring-4 ring-card" /><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold">{event.summary}</p><p className="text-xs capitalize text-muted-foreground">{event.eventType.replaceAll("_", " ")}</p></div><time className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</time></div></li>)}</ol> : <EmptyText>No profile changes recorded yet.</EmptyText>}</CardContent></Card>
      </div>

      <aside className="space-y-4">
        <Card className="border-emerald-500/20 bg-card/90"><CardHeader className="border-b border-border/70 p-4"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-emerald-500" />KYC decision</CardTitle></CardHeader><CardContent className="p-4"><form action={reviewAction} className="space-y-3"><div className="space-y-2"><Label htmlFor="notes">Review notes</Label><Textarea id="notes" name="notes" placeholder="Record the verification evidence and decision…" className="min-h-28" /></div><div className="grid grid-cols-2 gap-2"><Button name="status" value="verified">Verify KYC</Button><Button name="status" value="rejected" variant="destructive">Reject</Button></div><p className="text-[11px] leading-4 text-muted-foreground">Every decision is appended to the customer’s review history.</p></form></CardContent></Card>

        <Card className="border-border/80 bg-card/90"><CardHeader className="border-b border-border/70 p-4"><CardTitle className="text-base">KYC history</CardTitle></CardHeader><CardContent className="space-y-3 p-4">{customer.reviews.map((review) => <div key={review.id} className="rounded-xl border border-border/70 bg-muted/15 p-3"><div className="flex items-center justify-between gap-3"><StatusBadge status={review.status} /><time className="text-[11px] text-muted-foreground">{formatDateTime(review.reviewedAt)}</time></div>{review.notes && <p className="mt-2 text-sm leading-5 text-muted-foreground">{review.notes}</p>}</div>)}{customer.reviews.length === 0 && <EmptyText>No KYC review recorded.</EmptyText>}</CardContent></Card>
      </aside>
    </div>
  </div>;
}

function Detail({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string | null }) {
  return <div className="flex min-w-0 gap-3 border-b border-border/60 p-4 sm:odd:border-r"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted/60"><Icon className="h-4 w-4 text-muted-foreground" /></div><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-medium">{value || "Not provided"}</p></div></div>;
}

function EmptyText({ children }: { children: ReactNode }) { return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{children}</p>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
