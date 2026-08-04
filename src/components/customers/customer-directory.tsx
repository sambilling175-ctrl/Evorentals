"use client";

import * as React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  Mail,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createCustomer } from "@/app/(dashboard)/customers/actions";
import type { CustomerSummary, KycStatus } from "@/lib/services/customers";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CustomerFilter = "all" | KycStatus;

const filterLabels: Array<{ value: CustomerFilter; label: string }> = [
  { value: "all", label: "All customers" },
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

export function CustomerDirectory({ customers }: { customers: CustomerSummary[] }) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<CustomerFilter>("all");
  const deferredQuery = React.useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filtered = customers.filter((customer) => {
    const matchesFilter = filter === "all" || customer.kycStatus === filter;
    const searchable = `${customer.customerNumber} ${customer.fullName} ${customer.phone ?? ""} ${customer.email ?? ""}`.toLowerCase();
    return matchesFilter && searchable.includes(normalizedQuery);
  });
  const counts = React.useMemo(() => customers.reduce((result, customer) => {
    result[customer.kycStatus] += 1;
    return result;
  }, { verified: 0, pending: 0, rejected: 0, expired: 0 }), [customers]);

  return (
    <div className="space-y-5">
      <PageHeader title="Customers" description="Registration, contact details, KYC readiness and customer history in one live workspace.">
        <CreateCustomerDialog />
      </PageHeader>

      <section aria-label="Customer summary" className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <SummaryCard label="Total customers" value={customers.length} helper="Active customer records" icon={Users} tone="blue" />
        <SummaryCard label="KYC verified" value={counts.verified} helper={percentage(counts.verified, customers.length)} icon={BadgeCheck} tone="green" />
        <SummaryCard label="Awaiting review" value={counts.pending} helper="Queue requiring action" icon={Clock3} tone="amber" />
        <SummaryCard label="Needs attention" value={counts.rejected + counts.expired} helper="Rejected or expired KYC" icon={ShieldAlert} tone="red" />
      </section>

      <Card className="overflow-hidden border-border/80 bg-card/90 shadow-[0_18px_50px_-36px_rgba(37,99,235,0.7)]">
        <CardHeader className="gap-4 border-b border-border/80 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Customer directory</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{filtered.length.toLocaleString("en-IN")} of {customers.length.toLocaleString("en-IN")} records</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <div className="relative min-w-0 flex-1 sm:min-w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone, email or ID" aria-label="Search customers" className="h-10 bg-background/60 pl-9" />
            </div>
            <Button variant="outline" className="hidden gap-2 sm:flex" disabled><SlidersHorizontal className="h-4 w-4" />More filters</Button>
          </div>
        </CardHeader>

        <div className="overflow-x-auto border-b border-border/80 px-4" role="tablist" aria-label="Filter customers by KYC status">
          <div className="flex min-w-max gap-5">
            {filterLabels.map((item) => (
              <button key={item.value} type="button" role="tab" aria-selected={filter === item.value} onClick={() => setFilter(item.value)} className={cn("border-b-2 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", filter === item.value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                {item.label}<span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px]">{item.value === "all" ? customers.length : counts[item.value]}</span>
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-0">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[840px] text-left">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr><th className="px-4 py-3 font-semibold">Customer</th><th className="px-4 py-3 font-semibold">Contact</th><th className="px-4 py-3 font-semibold">Account</th><th className="px-4 py-3 font-semibold">KYC status</th><th className="px-4 py-3 font-semibold">Joined</th><th className="w-12 px-4 py-3"><span className="sr-only">Open</span></th></tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filtered.map((customer) => <CustomerRow key={customer.id} customer={customer} />)}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-border/70 md:hidden">
            {filtered.map((customer) => <CustomerMobileCard key={customer.id} customer={customer} />)}
          </div>
          {filtered.length === 0 && <div className="grid place-items-center gap-2 px-4 py-16 text-center"><div className="grid h-11 w-11 place-items-center rounded-full bg-muted"><UserRound className="h-5 w-5 text-muted-foreground" /></div><p className="text-sm font-semibold">No customers found</p><p className="text-xs text-muted-foreground">Try another search or KYC filter.</p></div>}
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerRow({ customer }: { customer: CustomerSummary }) {
  return <tr className="group [content-visibility:auto] [contain-intrinsic-size:0_65px] transition-colors hover:bg-primary/[0.035]"><td className="px-4 py-3"><Link href={`/customers/${customer.id}`} className="flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Avatar name={customer.fullName} /><div className="min-w-0"><p className="truncate text-sm font-semibold group-hover:text-primary">{customer.fullName}</p><p className="font-mono text-[11px] text-muted-foreground">{customer.customerNumber}</p></div></Link></td><td className="px-4 py-3"><Contact customer={customer} /></td><td className="px-4 py-3"><StatusBadge status={customer.status} /></td><td className="px-4 py-3"><StatusBadge status={customer.kycStatus} /></td><td className="px-4 py-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(customer.createdAt)}</span></td><td className="px-4 py-3"><Button asChild size="icon" variant="ghost" className="h-8 w-8"><Link href={`/customers/${customer.id}`} aria-label={`Open ${customer.fullName}`}><ChevronRight className="h-4 w-4" /></Link></Button></td></tr>;
}

function CustomerMobileCard({ customer }: { customer: CustomerSummary }) {
  return <Link href={`/customers/${customer.id}`} className="block p-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><div className="flex items-start gap-3"><Avatar name={customer.fullName} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="truncate text-sm font-semibold">{customer.fullName}</p><p className="font-mono text-[11px] text-muted-foreground">{customer.customerNumber}</p></div><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /></div><div className="mt-3 flex flex-wrap gap-2"><StatusBadge status={customer.kycStatus} /><StatusBadge status={customer.status} /></div><div className="mt-3"><Contact customer={customer} /></div></div></div></Link>;
}

function Contact({ customer }: { customer: CustomerSummary }) {
  return <div className="space-y-1 text-xs text-muted-foreground">{customer.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /><span>{customer.phone}</span></p>}{customer.email && <p className="flex min-w-0 items-center gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="max-w-56 truncate">{customer.email}</span></p>}{!customer.phone && !customer.email && <span>Contact not provided</span>}</div>;
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CU";
  return <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-500/20 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 text-xs font-bold text-cyan-500">{initials}</span>;
}

function SummaryCard({ label, value, helper, icon: Icon, tone }: { label: string; value: number; helper: string; icon: LucideIcon; tone: "blue" | "green" | "amber" | "red" }) {
  const tones = { blue: "border-blue-500/20 bg-blue-500/10 text-blue-500", green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500", amber: "border-amber-500/20 bg-amber-500/10 text-amber-500", red: "border-red-500/20 bg-red-500/10 text-red-500" };
  return <Card className="overflow-hidden border-border/80 bg-card/90"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value.toLocaleString("en-IN")}</p><p className="mt-1 text-[11px] text-muted-foreground">{helper}</p></div><div className={cn("grid h-11 w-11 place-items-center rounded-xl border", tones[tone])}><Icon className="h-5 w-5" /></div></CardContent></Card>;
}

function CreateCustomerDialog() {
  return <Dialog><DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Add customer</Button></DialogTrigger><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Register customer</DialogTitle><DialogDescription>Create the customer, primary address and optional first KYC document.</DialogDescription></DialogHeader><form action={createCustomer} className="grid gap-4 md:grid-cols-2"><Field label="Full name" name="fullName" required /><Field label="Mobile number" name="phone" inputMode="numeric" placeholder="9876543210" required /><Field label="Email" name="email" type="email" /><Field label="Driving licence" name="licenseNumber" /><Field label="Date of birth" name="dateOfBirth" type="date" /><Field label="Emergency contact" name="emergencyContact" /><div className="md:col-span-2"><Field label="Address line 1" name="line1" required /></div><div className="md:col-span-2"><Field label="Address line 2" name="line2" /></div><Field label="City" name="city" required /><Field label="State" name="state" required /><Field label="PIN code" name="pinCode" inputMode="numeric" required /><div className="space-y-2"><Label htmlFor="documentType">Document type</Label><select id="documentType" name="documentType" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">No document</option><option value="aadhaar">Aadhaar</option><option value="driving_licence">Driving licence</option><option value="pan">PAN</option><option value="address_proof">Address proof</option></select></div><Field label="Document number" name="documentNumber" /><Field label="Document expiry" name="expiresOn" type="date" /><div className="space-y-2 md:col-span-2"><Label htmlFor="document">KYC file</Label><Input id="document" name="document" type="file" accept=".pdf,.jpg,.jpeg,.png" /></div><div className="flex justify-end md:col-span-2"><Button type="submit">Create customer</Button></div></form></DialogContent></Dialog>;
}

function Field(props: React.ComponentProps<typeof Input> & { label: string }) {
  const { label, name, ...inputProps } = props;
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...inputProps} /></div>;
}

function percentage(value: number, total: number) { return total === 0 ? "No records yet" : `${Math.round((value / total) * 100)}% of customer base`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
