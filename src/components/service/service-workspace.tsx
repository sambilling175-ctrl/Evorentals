"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { ClipboardList, Plus, ShieldAlert, Wrench } from "lucide-react";
import { assignServiceJobCardAction, createServiceJobCardAction, initialServiceJobCardActionState, recordServiceIntakeInspectionAction, submitServiceRequest, initialServiceRequestActionState, transitionServiceJobCardAction } from "@/app/(dashboard)/service/actions";
import type { ServiceEmployee, ServiceIntakeInspection, ServiceJobCard, ServiceJobCardStatus, ServiceWorkspaceData } from "@/lib/services/service";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function ServiceWorkspace({ data }: { data: ServiceWorkspaceData }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Service & Maintenance" description="Capture service requests and move approved work through controlled job-card stages. Parts, vendors, intake inspection and QC details follow in later D13 milestones.">
        {data.canCreate && <Button asChild size="sm"><a href="#new-request"><Plus className="h-4 w-4" />New request</a></Button>}
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Service requests" value={data.totals.requests} icon={ClipboardList} tone="blue" />
        <Metric label="Awaiting intake" value={data.totals.requested} icon={Wrench} tone="amber" />
        <Metric label="High priority" value={data.totals.highPriority} icon={ShieldAlert} tone="red" />
        <Metric label="Active reasons" value={data.totals.activeReasons} icon={ClipboardList} tone="emerald" />
        <Metric label="Job cards" value={data.totals.jobCards} icon={ClipboardList} tone="purple" />
        <Metric label="Active jobs" value={data.totals.activeJobs} icon={Wrench} tone="cyan" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        {data.canCreate ? <RequestForm data={data} /> : <Card><CardHeader><CardTitle>Request intake</CardTitle><CardDescription>Your role can view requests, but cannot create them.</CardDescription></CardHeader></Card>}
        <RequestList data={data} />
      </div>
      <JobCardBoard data={data} />
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
  const jobCardRequestIds = new Set(data.jobCards.map((card) => card.requestId));
  return <Card className="border-border/80 bg-card/90"><CardHeader><CardTitle>Recent requests</CardTitle><CardDescription>{data.requests.length ? "Newest live service intake records" : "No service requests have been created yet."}</CardDescription></CardHeader><CardContent className="space-y-3">
    {data.requests.map((request) => <div key={request.id} className="rounded-xl border border-border/70 bg-muted/10 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-semibold">{request.number}</p><p className="text-sm text-muted-foreground">{request.vehicle} · {request.reason}</p></div><div className="flex shrink-0 items-center gap-2"><StatusBadge status={request.status} /><StatusBadge status={request.priority} /></div></div><p className="mt-3 text-sm leading-5 text-muted-foreground">{request.description}</p><div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(request.requestedAt))} · {request.source}</p>{data.canCreate && !jobCardRequestIds.has(request.id) && <JobCardCreateForm serviceRequestId={request.id} />}{jobCardRequestIds.has(request.id) && <span className="text-xs font-medium text-emerald-500">Job card created</span>}</div></div>)}
    {data.requests.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Submitted requests will appear here for the operations team.</div>}
  </CardContent></Card>;
}

function JobCardCreateForm({ serviceRequestId }: { serviceRequestId: string }) {
  const [state, action] = useActionState(createServiceJobCardAction, initialServiceJobCardActionState);
  return <form action={action} className="flex flex-wrap items-center gap-2"><input type="hidden" name="serviceRequestId" value={serviceRequestId} /><Button type="submit" size="sm" variant="outline"><Plus className="h-3.5 w-3.5" />Create job card</Button>{state.message && <span role="status" className={state.status === "error" ? "text-xs text-destructive" : "text-xs text-emerald-500"}>{state.message}</span>}</form>;
}

function JobCardBoard({ data }: { data: ServiceWorkspaceData }) {
  return <Card className="border-border/80 bg-card/90"><CardHeader><CardTitle>Job-card pipeline</CardTitle><CardDescription>Every transition is validated and appended to immutable job-card history. Fleet status is unchanged until D13-06.</CardDescription></CardHeader><CardContent className="space-y-3">
    {data.jobCards.map((card) => <JobCardRow key={card.id} card={card} canManage={data.canCreate} employees={data.employees} />)}
    {data.jobCards.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Create a job card from a service request to begin the pipeline.</div>}
  </CardContent></Card>;
}

const NEXT_STATUSES: Record<ServiceJobCardStatus, ServiceJobCardStatus[]> = {
  requested: ["inspection"], inspection: ["in_service"], in_service: ["waiting_parts", "qc"],
  waiting_parts: ["in_service", "qc"], qc: ["in_service", "completed"], completed: [],
};

function JobCardRow({ card, canManage, employees }: { card: ServiceJobCard; canManage: boolean; employees: ServiceEmployee[] }) {
  const [state, action] = useActionState(transitionServiceJobCardAction.bind(null, card.id), initialServiceJobCardActionState);
  const nextStatuses = NEXT_STATUSES[card.status];
  const intakeRequired = !card.intakeInspection && (card.status === "requested" || card.status === "inspection");
  return <div className="rounded-xl border border-border/70 bg-muted/10 p-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="font-semibold">{card.number}</p><p className="text-sm text-muted-foreground">{card.vehicle} · {card.reason}</p></div>
      <StatusBadge status={card.status} />
    </div>
    <p className="mt-2 text-xs text-muted-foreground">Updated {dateFormatter.format(new Date(card.updatedAt))}</p>
    {canManage && intakeRequired && <IntakeForm card={card} />}
    {card.intakeInspection && <IntakeSummary inspection={card.intakeInspection} />}
    {card.assignment && <AssignmentSummary card={card} />}
    {canManage && card.status !== "completed" && <AssignmentForm card={card} employees={employees} />}
    {canManage && nextStatuses.length > 0 && !intakeRequired && <form action={action} className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]"><SelectField name="toStatus" label="Next stage" options={nextStatuses.map((status) => ({ value: status, label: status.replaceAll("_", " ") }))} /><div className="space-y-2"><Label htmlFor={`notes-${card.id}`}>Transition note</Label><Textarea id={`notes-${card.id}`} name="notes" maxLength={1000} rows={2} placeholder="Optional handoff note…" /></div><div className="self-end"><JobCardSubmitButton /></div></form>}
    {state.message && <p role="status" className={state.status === "error" ? "mt-2 text-xs text-destructive" : "mt-2 text-xs text-emerald-500"}>{state.message}</p>}
  </div>;
}

function AssignmentSummary({ card }: { card: ServiceJobCard }) {
  const assignment = card.assignment;
  if (!assignment) return null;
  const target = assignment.assignmentType === "internal_employee"
    ? assignment.employeeName ?? "Internal employee"
    : assignment.externalGarageName ?? "External garage";
  const detail = assignment.assignmentType === "internal_employee"
    ? "Internal employee"
    : [assignment.externalGarageContact, assignment.externalGaragePhone].filter(Boolean).join(" · ");
  return <div className="mt-4 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 text-xs text-muted-foreground"><p className="font-semibold text-violet-300">Current assignment</p><p className="mt-1 text-sm text-foreground">{target}</p><p>{detail || "External garage"} · {dateFormatter.format(new Date(assignment.assignedAt))}</p>{assignment.notes && <p className="mt-1">{assignment.notes}</p>}</div>;
}

function AssignmentForm({ card, employees }: { card: ServiceJobCard; employees: ServiceEmployee[] }) {
  const [state, action] = useActionState(assignServiceJobCardAction.bind(null, card.id), initialServiceJobCardActionState);
  const [assignmentType, setAssignmentType] = useState<"internal_employee" | "external_garage">(card.assignment?.assignmentType ?? "internal_employee");
  const employeeId = useId();
  const garageNameId = useId();
  const contactId = useId();
  const phoneId = useId();
  const addressId = useId();
  const notesId = useId();
  return <form action={action} className="mt-4 space-y-3 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3"><div><p className="font-semibold">Assign job card</p><p className="text-xs text-muted-foreground">Assignments are append-only; reassigning creates a new immutable history row.</p></div><div className="grid gap-2 sm:grid-cols-2"><SelectField name="assignmentType" label="Assigned to" value={assignmentType} onChange={(value) => setAssignmentType(value as "internal_employee" | "external_garage")} options={[{ value: "internal_employee", label: "Internal employee" }, { value: "external_garage", label: "External garage" }]} />{assignmentType === "internal_employee" ? <div className="space-y-2"><Label htmlFor={employeeId}>Employee</Label><select id={employeeId} name="employeeId" required={assignmentType === "internal_employee"} defaultValue={card.assignment?.employeeId ?? ""} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Select active employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.designation}</option>)}</select></div> : <div className="space-y-2"><Label htmlFor={garageNameId}>Garage name</Label><Input id={garageNameId} name="externalGarageName" required={assignmentType === "external_garage"} maxLength={200} placeholder="Garage or service partner" /></div>}</div>{assignmentType === "external_garage" && <div className="grid gap-2 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={contactId}>Contact person</Label><Input id={contactId} name="externalGarageContact" maxLength={200} placeholder="Optional contact name" /></div><div className="space-y-2"><Label htmlFor={phoneId}>Phone</Label><Input id={phoneId} name="externalGaragePhone" maxLength={40} placeholder="Optional phone number" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor={addressId}>Address</Label><Input id={addressId} name="externalGarageAddress" maxLength={500} placeholder="Optional address" /></div></div>}<div className="space-y-2"><Label htmlFor={notesId}>Assignment note</Label><Textarea id={notesId} name="notes" maxLength={1000} rows={2} placeholder="Optional handoff or scope note" /></div><div className="flex flex-wrap items-center gap-2"><Button type="submit">Save assignment</Button>{state.message && <span role="status" className={state.status === "error" ? "text-xs text-destructive" : "text-xs text-emerald-500"}>{state.message}</span>}</div></form>;
}

const INTAKE_CHECKLIST = {
  battery: true,
  charger: true,
  keys: true,
  visual: true,
};

function IntakeForm({ card }: { card: ServiceJobCard }) {
  const [state, action] = useActionState(recordServiceIntakeInspectionAction, initialServiceJobCardActionState);
  const [checklist, setChecklist] = useState(INTAKE_CHECKLIST);
  const odometerId = useId();
  const batteryId = useId();
  const notesId = useId();
  const evidenceId = useId();
  return <form action={action} className="mt-4 space-y-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3">
    <input type="hidden" name="jobCardId" value={card.id} />
    <input type="hidden" name="checklist" value={JSON.stringify(checklist)} readOnly />
    <div><p className="font-semibold">Vehicle intake inspection</p><p className="text-xs text-muted-foreground">Capture a non-stale vehicle reading before the job card enters inspection.</p></div>
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="space-y-2"><Label htmlFor={odometerId}>Intake odometer (km)</Label><Input id={odometerId} name="odometer" type="number" min={card.currentOdometer} defaultValue={card.currentOdometer} required /></div>
      <div className="space-y-2"><Label htmlFor={batteryId}>Battery level (%)</Label><Input id={batteryId} name="batteryLevel" type="number" min={0} max={100} defaultValue={card.currentBatteryLevel} required /></div>
      <SelectField name="condition" label="Condition" options={[{ value: "excellent", label: "Excellent" }, { value: "good", label: "Good" }, { value: "fair", label: "Fair" }, { value: "damaged", label: "Damaged" }]} />
    </div>
    <fieldset className="space-y-2"><legend className="text-sm font-medium">Intake checklist</legend><div className="grid gap-2 sm:grid-cols-2">{Object.entries({ battery: "Battery and charger", charger: "Charger present", keys: "Keys and accessories", visual: "Visual condition checked" }).map(([name, label]) => <label key={name} className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={checklist[name as keyof typeof checklist]} onChange={(event) => setChecklist((current) => ({ ...current, [name]: event.target.checked }))} />{label}</label>)}</div></fieldset>
    <div className="space-y-2"><Label htmlFor={notesId}>Notes</Label><Textarea id={notesId} name="notes" maxLength={2000} placeholder="Record intake findings or exceptions" /></div>
    <div className="space-y-2"><Label htmlFor={evidenceId}>Evidence metadata (JSON array)</Label><Input id={evidenceId} name="evidenceMetadata" defaultValue="[]" placeholder={'[{"kind":"photo","reference":"intake-001"}]'} /></div>
    <div className="flex flex-wrap items-center gap-2"><Button type="submit">Record intake</Button>{state.message && <span role="status" className={state.status === "error" ? "text-xs text-destructive" : "text-xs text-emerald-500"}>{state.message}</span>}</div>
  </form>;
}

function IntakeSummary({ inspection }: { inspection: ServiceIntakeInspection }) {
  return <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted-foreground"><p className="font-semibold text-emerald-400">Intake recorded</p><p className="mt-1">{inspection.odometer.toLocaleString("en-IN")} km · {inspection.batteryLevel}% battery · {inspection.condition}</p><p className="mt-1">{dateFormatter.format(new Date(inspection.inspectedAt))}</p>{inspection.notes && <p className="mt-1">{inspection.notes}</p>}</div>;
}

function JobCardSubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Move stage"}</Button>;
}

function SelectField({ name, label, options, value, onChange }: { name: string; label: string; options: { value: string; label: string }[]; value?: string; onChange?: (value: string) => void }) {
  const id = useId();
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><select id={id} name={name} required value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create request"}</Button>;
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: "blue" | "amber" | "red" | "emerald" | "purple" | "cyan" }) {
  const tones = { blue: "bg-blue-500/10 text-blue-400", amber: "bg-amber-500/10 text-amber-400", red: "bg-red-500/10 text-red-400", emerald: "bg-emerald-500/10 text-emerald-400", purple: "bg-purple-500/10 text-purple-400", cyan: "bg-cyan-500/10 text-cyan-400" };
  return <Card className="border-border/80 bg-card/90"><CardContent className="flex items-center gap-3 p-4"><div className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{value.toLocaleString("en-IN")}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>;
}
