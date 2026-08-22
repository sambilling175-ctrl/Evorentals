"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Archive, Boxes, CircleAlert, ClipboardPlus, PackageCheck, Plus, RotateCcw, Truck, type LucideIcon } from "lucide-react";
import { archiveServicePartAction, createServicePartAction, initialServicePartActionState, recordServicePartMovementAction } from "@/app/(dashboard)/service/parts/actions";
import type { ServicePart, ServicePartDirectoryData } from "@/lib/services/service-parts";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const movementLabels = { receipt: "Receive", issue: "Issue", return: "Return", adjustment: "Adjust" } as const;

export function ServicePartsWorkspace({ data }: { data: ServicePartDirectoryData }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Spare parts" description="Track service parts, reorder signals, and every stock change in one immutable ledger.">
        <Button asChild size="sm"><a href="#new-part"><Plus className="h-4 w-4" />Add part</a></Button>
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active parts" value={data.totals.active} icon={Boxes} tone="cyan" />
        <Metric label="Low stock" value={data.totals.lowStock} icon={CircleAlert} tone="amber" />
        <Metric label="Units on hand" value={data.totals.unitsOnHand} icon={PackageCheck} tone="emerald" />
        <Metric label="Stock value" value={data.totals.stockValue} icon={Truck} tone="violet" currency />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {data.canManage ? <PartForm /> : <Card><CardHeader><CardTitle>Catalogue access</CardTitle><CardDescription>Your role can view parts, but cannot create or move stock.</CardDescription></CardHeader></Card>}
        <PartList data={data} />
      </div>
      <StockHistory data={data} />
    </div>
  );
}

function PartForm() {
  const [state, action] = useActionState(createServicePartAction, initialServicePartActionState);
  return <Card id="new-part" className="scroll-mt-6 border-border/80 bg-card/90"><CardHeader><CardTitle>Add catalogue part</CardTitle><CardDescription>Define the reorder threshold and current cost before receiving stock.</CardDescription></CardHeader><CardContent><form action={action} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field name="partNumber" label="Part number" placeholder="e.g. BRK-PAD-001" required /><Field name="name" label="Part name" placeholder="Front brake pad" required /><Field name="category" label="Category" placeholder="Brakes, battery, body" /><Field name="unit" label="Unit" placeholder="piece" defaultValue="piece" required /><Field name="reorderLevel" label="Reorder at" type="number" min={0} defaultValue={0} required /><Field name="unitCost" label="Unit cost (₹)" type="number" min={0} step="0.01" defaultValue={0} required /></div><div className="space-y-2"><Label htmlFor="part-description">Description</Label><Textarea id="part-description" name="description" maxLength={500} placeholder="Fitment, supplier notes, or compatibility" /></div>{state.message && <p role="status" className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-500"}>{state.message}</p>}<SubmitButton label="Save catalogue part" /></form></CardContent></Card>;
}

function PartList({ data }: { data: ServicePartDirectoryData }) {
  return <Card className="border-border/80 bg-card/90"><CardHeader><CardTitle>Parts catalogue</CardTitle><CardDescription>{data.parts.length ? `${data.parts.length.toLocaleString("en-IN")} active and archived-ready records` : "No parts yet. Add a catalogue entry before receiving stock."}</CardDescription></CardHeader><CardContent className="space-y-3">{data.parts.map((part) => <PartRow key={part.id} part={part} canManage={data.canManage} />)}{data.parts.length === 0 && <div className="rounded-xl border border-dashed border-border p-10 text-center"><Boxes className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">Catalogue is ready</p><p className="mt-1 text-sm text-muted-foreground">Create a part, then record a receipt to establish stock.</p></div>}</CardContent></Card>;
}

function PartRow({ part, canManage }: { part: ServicePart; canManage: boolean }) {
  const [archiveState, archiveAction] = useActionState(archiveServicePartAction.bind(null, part.id), initialServicePartActionState);
  const [movementState, movementAction] = useActionState(recordServicePartMovementAction, initialServicePartActionState);
  return <div className="rounded-xl border border-border/70 bg-muted/10 p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{part.name}</p><span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300">{part.partNumber}</span>{part.isLowStock && <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">Low stock</span>}</div><p className="mt-1 text-sm text-muted-foreground">{part.category || "Uncategorized"} · ₹{part.unitCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })} / {part.unit}</p><p className="mt-2 text-2xl font-bold">{part.quantityOnHand.toLocaleString("en-IN")} <span className="text-xs font-normal text-muted-foreground">{part.unit} on hand · reorder at {part.reorderLevel}</span></p></div>{canManage && part.isActive && part.quantityOnHand === 0 && <form action={archiveAction}><Button type="submit" size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label={`Archive ${part.name}`}><Archive className="h-4 w-4" />Archive</Button>{archiveState.message && <span role="status" className={archiveState.status === "error" ? "block text-xs text-destructive" : "block text-xs text-emerald-500"}>{archiveState.message}</span>}</form>}</div>{canManage && part.isActive && <form action={movementAction} className="mt-4 grid gap-2 border-t border-border/60 pt-4 sm:grid-cols-[1fr_1fr_1fr_auto]"><input type="hidden" name="partId" value={part.id} /><select name="movementType" aria-label={`Movement type for ${part.name}`} className="h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="receipt">Receive (+)</option><option value="issue">Issue (-)</option><option value="return">Return (+)</option><option value="adjustment">Adjustment (+/-)</option></select><Input name="quantityDelta" type="number" step={1} defaultValue={1} aria-label={`Quantity delta for ${part.name}`} placeholder="Quantity delta" /><Input name="unitCost" type="number" min={0} step="0.01" placeholder="Cost override (₹)" aria-label={`Cost override for ${part.name}`} /><Button type="submit" size="sm"><ClipboardPlus className="h-4 w-4" />Post</Button>{movementState.message && <span role="status" className={movementState.status === "error" ? "text-xs text-destructive sm:col-span-4" : "text-xs text-emerald-500 sm:col-span-4"}>{movementState.message}</span>}</form>}</div>;
}

function StockHistory({ data }: { data: ServicePartDirectoryData }) {
  const names = new Map(data.parts.map((part) => [part.id, part.name]));
  return <Card className="border-border/80 bg-card/90"><CardHeader><CardTitle>Recent stock movements</CardTitle><CardDescription>Append-only activity from the stock ledger. Future job-card consumption will add references here.</CardDescription></CardHeader><CardContent className="space-y-2">{data.movements.map((movement) => <div key={movement.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-sm"><span className="inline-flex items-center gap-2"><RotateCcw className="h-4 w-4 text-cyan-300" />{names.get(movement.partId) ?? "Part"}</span><span className={movement.quantityDelta > 0 ? "text-emerald-400" : "text-amber-300"}>{movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta} units</span><span className="text-xs capitalize text-muted-foreground">{movementLabels[movement.movementType]} · {new Date(movement.occurredAt).toLocaleDateString("en-IN")}</span></div>)}{data.movements.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No stock movements yet.</p>}</CardContent></Card>;
}

function Field({ name, label, ...props }: { name: string; label: string } & React.ComponentProps<typeof Input>) { return <div className="space-y-2"><Label htmlFor={`part-${name}`}>{label}</Label><Input id={`part-${name}`} name={name} {...props} /> </div>; }
function SubmitButton({ label }: { label: string }) { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? "Saving…" : label}</Button>; }
function Metric({ label, value, icon: Icon, tone, currency }: { label: string; value: number; icon: LucideIcon; tone: "cyan" | "amber" | "emerald" | "violet"; currency?: boolean }) { const tones = { cyan: "text-cyan-300 border-cyan-500/20 bg-cyan-500/10", amber: "text-amber-300 border-amber-500/20 bg-amber-500/10", emerald: "text-emerald-300 border-emerald-500/20 bg-emerald-500/10", violet: "text-violet-300 border-violet-500/20 bg-violet-500/10" }; return <Card className="border-border/80 bg-card/90"><CardContent className="flex items-center justify-between p-4"><div><p className="text-2xl font-bold">{currency ? `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : value.toLocaleString("en-IN")}</p><p className="text-xs text-muted-foreground">{label}</p></div><span className={`rounded-xl border p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5" /></span></CardContent></Card>; }
