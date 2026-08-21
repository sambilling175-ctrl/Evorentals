"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";
import { ClipboardList, Plus, ShieldAlert, Wrench } from "lucide-react";
import { submitServiceRequest, initialServiceRequestActionState } from "@/app/(dashboard)/service/actions";
import type { ServiceWorkspaceData } from "@/lib/services/service";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function ServiceWorkspace({ data }: { data: ServiceWorkspaceData }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Service & Maintenance" description="Capture live service requests against the company fleet. Job cards, inspections, parts and QC follow in later D13 milestones.">
        {data.canCreate && <Button asChild size="sm"><a href="#new-request"><Plus className="h-4 w-4" />New request</a></Button>}
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Service requests" value={data.totals.requests} icon={ClipboardList} tone="blue" />
        <Metric label="Awaiting intake" value={data.totals.requested} icon={Wrench} tone="amber" />
        <Metric label="High priority" value={data.totals.highPriority} icon={ShieldAlert} tone="red" />
        <Metric label="Active reasons" value={data.totals.activeReasons} icon={ClipboardList} tone="emerald" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        {data.canCreate ? <RequestForm data={data} /> : <Card><CardHeader><CardTitle>Request intake</CardTitle><CardDescription>Your role can view requests, but cannot create them.</CardDescription></CardHeader></Card>}
        <RequestList data={data} />
      </div>
    </div>
  );
}

function RequestForm({ data }: { data: ServiceWorkspaceData }) {
  const [state, action] = useActionState(submitServiceRequest, initialServiceRequestActionState);
  return <Card id="new-request" className="scroll-mt-6 border-border/80 bg-card/90"><CardHeader><CardTitle>Create service request</CardTitle><CardDescription>Requests are company-scoped and start in the requested state. No service job or fleet transition is performed yet.</CardDescription></CardHeader><CardContent>
    {data.vehicles.length === 0 || data.reasons.length === 0 ? <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">Add an active vehicle and service reason before creating a request.</p> : <form action={action} className="space-y-4">
      <SelectField name="bikeId" label="Vehicle" options={data.vehicles.map((vehicle) => ({ value: vehicle.id, label: `${vehicle.label} · ${vehicle.batteryLevel}% battery` }))} />
      <SelectField name="reasonId" label="Service reason" options={data.reasons.map((reason) => ({ value: reason.id, label: `${reason.name} · ${reason.category}` }))} />
      <SelectField name="priority" label="Priority" options={[{ value: "medium", label: "Medium" }, { value: "low", label: "Low" }, { value: "high", label: "High" }, { value: "urgent", label: "Urgent" }]} />
      <div className="space-y-2"><Label htmlFor="service-description">Description</Label><Textarea id="service-description" name="description" required minLength={5} maxLength={2000} placeholder="Describe the issue, symptom, or requested work…" className="min-h-28" /></div>
      {state.message && <p role="status" className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-500"}>{state.message}</p>}
      <SubmitButton />
    </form>}
  </CardContent></Card>;
}

function RequestList({ data }: { data: ServiceWorkspaceData }) {
  return <Card className="border-border/80 bg-card/90"><CardHeader><CardTitle>Recent requests</CardTitle><CardDescription>{data.requests.length ? "Newest live service intake records" : "No service requests have been created yet."}</CardDescription></CardHeader><CardContent className="space-y-3">
    {data.requests.map((request) => <div key={request.id} className="rounded-xl border border-border/70 bg-muted/10 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-semibold">{request.number}</p><p className="text-sm text-muted-foreground">{request.vehicle} · {request.reason}</p></div><div className="flex shrink-0 items-center gap-2"><StatusBadge status={request.status} /><StatusBadge status={request.priority} /></div></div><p className="mt-3 text-sm leading-5 text-muted-foreground">{request.description}</p><p className="mt-2 text-xs text-muted-foreground">{dateFormatter.format(new Date(request.requestedAt))} · {request.source}</p></div>)}
    {data.requests.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Submitted requests will appear here for the operations team.</div>}
  </CardContent></Card>;
}

function SelectField({ name, label, options }: { name: string; label: string; options: { value: string; label: string }[] }) {
  const id = useId();
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><select id={id} name={name} required className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create request"}</Button>;
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: "blue" | "amber" | "red" | "emerald" }) {
  const tones = { blue: "bg-blue-500/10 text-blue-400", amber: "bg-amber-500/10 text-amber-400", red: "bg-red-500/10 text-red-400", emerald: "bg-emerald-500/10 text-emerald-400" };
  return <Card className="border-border/80 bg-card/90"><CardContent className="flex items-center gap-3 p-4"><div className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{value.toLocaleString("en-IN")}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>;
}
