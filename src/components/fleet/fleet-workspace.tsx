"use client";

import { useActionState, useDeferredValue, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { Bike, CalendarClock, CircleCheckBig, KeyRound, Plus, Search, Wrench } from "lucide-react";
import { initialVehicleActionState, registerVehicle, updateVehicle } from "@/app/(dashboard)/fleet/actions";
import type { FleetWorkspaceData, VehicleRecord } from "@/lib/services/fleet";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const numberFormatter = new Intl.NumberFormat("en-IN");

const FILTERS = ["all", "available", "rented", "reserved", "maintenance"] as const;
type Filter = (typeof FILTERS)[number];

const EDITABLE_STATUSES: [string, string][] = [["available", "Available"], ["reserved", "Reserved"], ["maintenance", "Maintenance"], ["retired", "Retired"]];

export function FleetWorkspace({ data }: { data: FleetWorkspaceData }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [filter, setFilter] = useState<Filter>("all");
  const vehicles = data.vehicles.filter((vehicle) => {
    const matchesFilter = filter === "all" || vehicle.availability === filter;
    const haystack = `${vehicle.serialNumber} ${vehicle.model} ${vehicle.manufacturer} ${vehicle.variant} ${vehicle.registrationNumber} ${vehicle.category} ${vehicle.color}`.toLowerCase();
    return matchesFilter && (!deferredQuery || haystack.includes(deferredQuery));
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Bike} label="Total fleet" value={data.totals.all} tone="blue" />
        <Metric icon={CircleCheckBig} label="Available" value={data.totals.available} tone="emerald" />
        <Metric icon={KeyRound} label="Rented" value={data.totals.rented} tone="purple" />
        <Metric icon={CalendarClock} label="Reserved" value={data.totals.reserved} tone="cyan" />
        <Metric icon={Wrench} label="Maintenance" value={data.totals.maintenance} tone="amber" />
      </div>

      <Card className="border-border/80 bg-card/90">
        <CardHeader className="gap-4 border-b border-border/70 lg:flex-row lg:items-center lg:justify-between">
          <div><CardTitle>Vehicle directory</CardTitle><CardDescription>Live vehicles in your company. Availability is derived from active rentals and each vehicle&apos;s status.</CardDescription></div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative w-full lg:w-80"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicles…" aria-label="Search vehicles" className="pl-9" /></div>
            {data.canManage && <RegisterVehicleDialog />}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex gap-2 overflow-x-auto border-b border-border/70 p-3" aria-label="Vehicle availability filter">
            {FILTERS.map((value) => <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)} aria-pressed={filter === value} className="capitalize">{value === "all" ? "All vehicles" : value}</Button>)}
            <span className="ml-auto self-center whitespace-nowrap text-xs text-muted-foreground">{vehicles.length} result{vehicles.length === 1 ? "" : "s"}</span>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/70 bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Registration</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Battery</th><th className="px-4 py-3">Odometer</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-border/60">{vehicles.map((vehicle) => <VehicleRow key={vehicle.id} vehicle={vehicle} canManage={data.canManage} />)}</tbody>
            </table>
          </div>
          <div className="divide-y divide-border/60 md:hidden">{vehicles.map((vehicle) => <VehicleMobileCard key={vehicle.id} vehicle={vehicle} canManage={data.canManage} />)}</div>
          {vehicles.length === 0 && <p className="px-4 py-12 text-center text-sm text-muted-foreground">{data.vehicles.length === 0 ? "No vehicles registered yet." : "No vehicles match this filter."}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function vehicleName(vehicle: VehicleRecord) {
  return vehicle.manufacturer ? `${vehicle.manufacturer} ${vehicle.model}` : vehicle.model;
}

function VehicleRow({ vehicle, canManage }: { vehicle: VehicleRecord; canManage: boolean }) {
  return <tr className="transition-colors hover:bg-muted/15"><td className="px-4 py-3"><VehicleIdentity vehicle={vehicle} /></td><td className="px-4 py-3">{vehicle.registrationNumber || <span className="text-muted-foreground">Not recorded</span>}</td><td className="px-4 py-3">{vehicle.category ? <Badge variant="outline">{vehicle.category}</Badge> : <span className="text-muted-foreground">—</span>}</td><td className="px-4 py-3">{vehicle.batteryLevel}%</td><td className="px-4 py-3">{numberFormatter.format(vehicle.currentOdometer)} km</td><td className="px-4 py-3"><StatusBadge status={vehicle.availability} /></td><td className="px-4 py-3 text-muted-foreground">{vehicle.updatedAt ? dateFormatter.format(new Date(vehicle.updatedAt)) : "—"}</td><td className="px-4 py-3 text-right">{canManage ? <EditVehicleDialog vehicle={vehicle} /> : <span className="text-xs text-muted-foreground">View only</span>}</td></tr>;
}

function VehicleMobileCard({ vehicle, canManage }: { vehicle: VehicleRecord; canManage: boolean }) {
  return <div className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><VehicleIdentity vehicle={vehicle} /><StatusBadge status={vehicle.availability} /></div><div className="flex flex-wrap gap-2">{vehicle.registrationNumber && <Badge variant="outline">{vehicle.registrationNumber}</Badge>}{vehicle.category && <Badge variant="secondary">{vehicle.category}</Badge>}</div><p className="text-xs text-muted-foreground">Battery {vehicle.batteryLevel}% · {numberFormatter.format(vehicle.currentOdometer)} km</p>{canManage && <EditVehicleDialog vehicle={vehicle} />}</div>;
}

function VehicleIdentity({ vehicle }: { vehicle: VehicleRecord }) {
  return <div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><Bike className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate font-semibold">{vehicleName(vehicle)}</p><p className="truncate text-xs text-muted-foreground">{vehicle.serialNumber}{vehicle.variant ? ` · ${vehicle.variant}` : ""}{vehicle.color ? ` · ${vehicle.color}` : ""}</p></div></div>;
}

function RegisterVehicleDialog() {
  const [state, action] = useActionState(registerVehicle, initialVehicleActionState);
  return <Dialog><DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Register vehicle</Button></DialogTrigger><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Register vehicle</DialogTitle><DialogDescription>Add a vehicle to the live fleet directory. Availability starts from the status you set here.</DialogDescription></DialogHeader><VehicleForm action={action} state={state} submitLabel="Register vehicle" /></DialogContent></Dialog>;
}

function EditVehicleDialog({ vehicle }: { vehicle: VehicleRecord }) {
  const [state, action] = useActionState(updateVehicle.bind(null, vehicle.id), initialVehicleActionState);
  return <Dialog><DialogTrigger asChild><Button size="sm" variant="outline">Edit</Button></DialogTrigger><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Edit {vehicleName(vehicle)}</DialogTitle><DialogDescription>Update vehicle master details. Rented status is derived from active rentals and cannot be set manually.</DialogDescription></DialogHeader><VehicleForm action={action} state={state} vehicle={vehicle} submitLabel="Save vehicle" /></DialogContent></Dialog>;
}

function VehicleForm({ action, state, vehicle, submitLabel }: { action: (payload: FormData) => void; state: { status: string; message: string }; vehicle?: VehicleRecord; submitLabel: string }) {
  const statusOptions = [...EDITABLE_STATUSES];
  if (vehicle && vehicle.status && !EDITABLE_STATUSES.some(([value]) => value === vehicle.status)) statusOptions.unshift([vehicle.status, `${vehicle.status} (current)`]);
  return <form action={action} className="grid gap-4 md:grid-cols-2"><Field label="Serial / fleet ID" name="serialNumber" defaultValue={vehicle?.serialNumber === "Not assigned" ? "" : (vehicle?.serialNumber ?? "")} placeholder="EV-101" required /><Field label="Model" name="model" defaultValue={vehicle?.model ?? ""} placeholder="Ather 450X" required /><Field label="Manufacturer" name="manufacturer" defaultValue={vehicle?.manufacturer ?? ""} placeholder="Ather" /><Field label="Variant" name="variant" defaultValue={vehicle?.variant ?? ""} /><Field label="Color" name="color" defaultValue={vehicle?.color ?? ""} /><Field label="Category" name="category" defaultValue={vehicle?.category ?? ""} placeholder="Scooter" /><Field label="Registration number" name="registrationNumber" defaultValue={vehicle?.registrationNumber ?? ""} placeholder="KA01EV1234" /><Field label="VIN / chassis number" name="vinNumber" defaultValue={vehicle?.vinNumber ?? ""} /><Field label="Manufacturing year" name="manufacturingYear" defaultValue={vehicle?.manufacturingYear?.toString() ?? ""} type="number" min={2000} max={new Date().getFullYear() + 1} /><Field label="Purchase date" name="purchaseDate" defaultValue={vehicle?.purchaseDate ?? ""} type="date" /><Field label="Odometer (km)" name="currentOdometer" defaultValue={vehicle?.currentOdometer.toString() ?? "0"} type="number" min={0} inputMode="numeric" /><Field label="Battery level (%)" name="batteryLevel" defaultValue={vehicle?.batteryLevel.toString() ?? "100"} type="number" min={0} max={100} inputMode="numeric" /><SelectField label="Status" name="status" defaultValue={vehicle?.status || "available"} options={statusOptions} /><div className="space-y-2 md:col-span-2"><NotesField defaultValue={vehicle?.notes ?? ""} /></div><div className="md:col-span-2"><p role="status" className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-500"}>{state.message}</p></div><div className="flex justify-end md:col-span-2"><SubmitButton label={submitLabel} /></div></form>;
}

function SubmitButton({ label }: { label: string }) { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? "Saving…" : label}</Button>; }
function Field({ label, name, defaultValue, ...props }: { label: string; name: string; defaultValue: string } & Omit<React.ComponentProps<typeof Input>, "name" | "defaultValue">) { const id = useId(); return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} name={name} defaultValue={defaultValue} {...props} /></div>; }
function SelectField({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: string[][] }) { const id = useId(); return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><select id={id} name={name} defaultValue={defaultValue} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>; }
function NotesField({ defaultValue }: { defaultValue: string }) { const id = useId(); return <><Label htmlFor={id}>Notes</Label><Textarea id={id} name="notes" defaultValue={defaultValue} rows={3} maxLength={500} /></>; }
function Metric({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: "blue" | "emerald" | "amber" | "purple" | "cyan" }) { const tones = { blue: "bg-blue-500/10 text-blue-400", emerald: "bg-emerald-500/10 text-emerald-400", amber: "bg-amber-500/10 text-amber-400", purple: "bg-purple-500/10 text-purple-400", cyan: "bg-cyan-500/10 text-cyan-400" }; return <Card className="border-border/80 bg-card/90"><CardContent className="flex items-center gap-3 p-4"><div className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>; }
