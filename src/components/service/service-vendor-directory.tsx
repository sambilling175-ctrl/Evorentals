"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Archive, Building2, Factory, MapPin, Phone, Plus, Store, type LucideIcon } from "lucide-react";
import { createServiceVendorAction, archiveServiceVendorAction, initialServiceVendorActionState } from "@/app/(dashboard)/service/vendors/actions";
import type { ServiceVendor, ServiceVendorDirectoryData } from "@/lib/services/service-vendors";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const vendorTypeLabels = {
  garage: "Garage",
  parts_vendor: "Parts vendor",
  service_center: "Service center",
} as const;

export function ServiceVendorDirectory({ data }: { data: ServiceVendorDirectoryData }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Vendors & garages" description="Keep the trusted service network ready for job-card assignments and parts workflows.">
        <Button asChild size="sm"><a href="#new-vendor"><Plus className="h-4 w-4" />Add vendor</a></Button>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active directory" value={data.totals.active} icon={Building2} />
        <Metric label="Garages" value={data.totals.garages} icon={Store} />
        <Metric label="Parts vendors" value={data.totals.partsVendors} icon={Factory} />
        <Metric label="Service centers" value={data.totals.serviceCenters} icon={Building2} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {data.canManage ? <VendorForm /> : <Card><CardHeader><CardTitle>Directory access</CardTitle><CardDescription>Your role can view vendors, but cannot add or archive entries.</CardDescription></CardHeader></Card>}
        <VendorList data={data} />
      </div>
    </div>
  );
}

function VendorForm() {
  const [state, action] = useActionState(createServiceVendorAction, initialServiceVendorActionState);
  return (
    <Card id="new-vendor" className="scroll-mt-6 border-border/80 bg-card/90">
      <CardHeader><CardTitle>Add directory entry</CardTitle><CardDescription>Capture a garage, parts vendor, or service center once. No service job is created here.</CardDescription></CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField name="vendorType" label="Entry type" options={Object.entries(vendorTypeLabels).map(([value, label]) => ({ value, label }))} />
            <Field name="name" label="Business name" placeholder="e.g. City EV Garage" required />
            <Field name="contactName" label="Contact person" placeholder="Optional" />
            <Field name="phone" label="Phone" placeholder="+91 …" />
            <Field name="email" label="Email" type="email" placeholder="Optional" />
            <Field name="gstin" label="GSTIN" placeholder="Optional" />
          </div>
          <div className="space-y-2"><Label htmlFor="vendor-address">Address</Label><Textarea id="vendor-address" name="address" maxLength={500} placeholder="Workshop or office address" /></div>
          <div className="space-y-2"><Label htmlFor="vendor-notes">Notes</Label><Textarea id="vendor-notes" name="notes" maxLength={1000} placeholder="Service coverage, pickup terms, or internal notes" /></div>
          {state.message && <p role="status" className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-500"}>{state.message}</p>}
          <SubmitButton label="Save directory entry" />
        </form>
      </CardContent>
    </Card>
  );
}

function VendorList({ data }: { data: ServiceVendorDirectoryData }) {
  return (
    <Card className="border-border/80 bg-card/90">
      <CardHeader><CardTitle>Service network</CardTitle><CardDescription>{data.vendors.length ? `${data.vendors.length.toLocaleString("en-IN")} active and archived-ready records` : "No vendor records yet. Add the first trusted service partner."}</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {data.vendors.map((vendor) => <VendorRow key={vendor.id} vendor={vendor} canManage={data.canManage} />)}
        {data.vendors.length === 0 && <div className="rounded-xl border border-dashed border-border p-10 text-center"><Building2 className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">Directory is ready</p><p className="mt-1 text-sm text-muted-foreground">Use the form to add a garage or vendor without creating production service work.</p></div>}
      </CardContent>
    </Card>
  );
}

function VendorRow({ vendor, canManage }: { vendor: ServiceVendor; canManage: boolean }) {
  const [state, action] = useActionState(archiveServiceVendorAction.bind(null, vendor.id), initialServiceVendorActionState);
  return (
    <div className="rounded-xl border border-border/70 bg-muted/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{vendor.name}</p><span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300">{vendorTypeLabels[vendor.vendorType]}</span>{!vendor.isActive && <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">Inactive</span>}</div>
          {vendor.contactName && <p className="mt-1 text-sm text-muted-foreground">{vendor.contactName}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">{vendor.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{vendor.phone}</span>}{vendor.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{vendor.address}</span>}</div>
        </div>
        {canManage && vendor.isActive && <form action={action}><Button type="submit" size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label={`Archive ${vendor.name}`}><Archive className="h-4 w-4" />Archive</Button>{state.message && <span role="status" className={state.status === "error" ? "block text-xs text-destructive" : "block text-xs text-emerald-500"}>{state.message}</span>}</form>}
      </div>
      {vendor.notes && <p className="mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">{vendor.notes}</p>}
    </div>
  );
}

function Field({ name, label, ...props }: { name: string; label: string } & React.ComponentProps<typeof Input>) {
  const id = `vendor-${name}`;
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} name={name} {...props} /></div>;
}

function SelectField({ name, label, options }: { name: string; label: string; options: { value: string; label: string }[] }) {
  return <div className="space-y-2"><Label htmlFor={`vendor-${name}`}>{label}</Label><select id={`vendor-${name}`} name={name} required className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select type</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Saving…" : label}</Button>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return <Card className="border-border/80 bg-card/90"><CardContent className="flex items-center justify-between p-4"><div><p className="text-2xl font-bold">{value.toLocaleString("en-IN")}</p><p className="text-xs text-muted-foreground">{label}</p></div><span className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2.5 text-cyan-300"><Icon className="h-5 w-5" /></span></CardContent></Card>;
}
