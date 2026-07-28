"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, Clock3, Plus, Search, ShieldAlert, Users } from "lucide-react";
import { createCustomer } from "@/app/(dashboard)/customers/actions";
import type { CustomerSummary } from "@/lib/services/customers";
import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const trend = [42, 48, 46, 57, 53, 64, 61, 72, 68, 79, 74, 86];

export function CustomerDirectory({ customers }: { customers: CustomerSummary[] }) {
  const [query, setQuery] = React.useState("");
  const filtered = customers.filter((customer) =>
    `${customer.customerNumber} ${customer.fullName} ${customer.phone ?? ""} ${customer.email ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  const verified = customers.filter((customer) => customer.kycStatus === "verified").length;
  const pending = customers.filter((customer) => customer.kycStatus === "pending").length;
  const expired = customers.filter((customer) => customer.kycStatus === "expired").length;
  const metrics = [
    { title: "Total Customers", value: customers.length.toLocaleString("en-IN"), change: 0, changeType: "neutral" as const, icon: Users, color: "cyan" as const, trend },
    { title: "KYC Verified", value: verified.toLocaleString("en-IN"), change: 0, changeType: "neutral" as const, icon: BadgeCheck, color: "green" as const, trend },
    { title: "KYC Pending", value: pending.toLocaleString("en-IN"), change: 0, changeType: "neutral" as const, icon: Clock3, color: "orange" as const, trend: [...trend].reverse() },
    { title: "KYC Expired", value: expired.toLocaleString("en-IN"), change: 0, changeType: "neutral" as const, icon: ShieldAlert, color: "red" as const, trend },
  ];
  return (
    <div className="space-y-4">
      <PageHeader title="Customers" description="Live customer profiles, addresses, KYC documents and review history.">
        <Dialog>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Add customer</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader><DialogTitle>Register customer</DialogTitle><DialogDescription>Create the customer, primary address and optional first KYC document.</DialogDescription></DialogHeader>
            <form action={createCustomer} className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" name="fullName" required />
              <Field label="Mobile number" name="phone" inputMode="numeric" placeholder="9876543210" required />
              <Field label="Email" name="email" type="email" />
              <Field label="Driving licence" name="licenseNumber" />
              <Field label="Date of birth" name="dateOfBirth" type="date" />
              <Field label="Emergency contact" name="emergencyContact" />
              <div className="md:col-span-2"><Field label="Address line 1" name="line1" required /></div>
              <div className="md:col-span-2"><Field label="Address line 2" name="line2" /></div>
              <Field label="City" name="city" required />
              <Field label="State" name="state" required />
              <Field label="PIN code" name="pinCode" inputMode="numeric" required />
              <div className="space-y-2"><Label htmlFor="documentType">Document type</Label><select id="documentType" name="documentType" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">No document</option><option value="aadhaar">Aadhaar</option><option value="driving_licence">Driving licence</option><option value="pan">PAN</option><option value="address_proof">Address proof</option></select></div>
              <Field label="Document number" name="documentNumber" />
              <Field label="Document expiry" name="expiresOn" type="date" />
              <div className="space-y-2 md:col-span-2"><Label htmlFor="document">KYC file</Label><Input id="document" name="document" type="file" accept=".pdf,.jpg,.jpeg,.png" /></div>
              <div className="flex justify-end md:col-span-2"><Button type="submit">Create customer</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric, index) => <KPICard key={metric.title} {...metric} sparklineData={metric.trend} index={index} />)}</div>
      <Card>
        <CardHeader className="flex-row items-center justify-between border-b p-4"><CardTitle className="text-base">Customer directory</CardTitle><div className="relative w-full max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers…" className="pl-9" /></div></CardHeader>
        <CardContent className="divide-y p-0">
          {filtered.map((customer) => <Link key={customer.id} href={`/customers/${customer.id}`} className="grid gap-3 p-4 transition-colors hover:bg-muted/30 sm:grid-cols-[120px_1fr_auto] sm:items-center"><span className="font-mono text-xs font-semibold text-primary">{customer.customerNumber}</span><div><p className="text-sm font-semibold">{customer.fullName}</p><p className="text-xs text-muted-foreground">{customer.phone ?? "No phone"} · {customer.email ?? "No email"}</p></div><StatusBadge status={customer.kycStatus} /></Link>)}
          {filtered.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No customers found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Field(props: React.ComponentProps<typeof Input> & { label: string }) {
  const { label, name, ...inputProps } = props;
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...inputProps} /></div>;
}
