import { BadgeIndianRupee, HandCoins, ReceiptIndianRupee, RotateCcw, TriangleAlert } from "lucide-react";
import type { ReceivablesWorkspaceData } from "@/lib/services/receivables";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/feedback/status-badge";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const date = (value: string) => new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export function ReceivablesWorkspace({ data }: { data: ReceivablesWorkspaceData }) {
  const metrics = [
    ["Invoiced", data.totals.invoiced, ReceiptIndianRupee], ["Collected", data.totals.collected, HandCoins],
    ["Outstanding", data.totals.outstanding, BadgeIndianRupee], ["Overdue", data.totals.overdue, TriangleAlert],
    ["Refunded", data.totals.refunds, RotateCcw],
  ] as const;
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label, value, Icon]) => <Card key={label}><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-primary" /></div><p className="mt-2 text-xl font-bold">{money.format(value)}</p></CardContent></Card>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <Card><CardHeader><CardTitle>Invoices and dues</CardTitle><CardDescription>Balances are derived from immutable invoices and payment allocations.</CardDescription></CardHeader><CardContent className="space-y-2">{data.invoices.map((invoice) => <article key={invoice.id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex items-center gap-2"><p className="font-semibold">{invoice.number}</p><StatusBadge status={invoice.status} /></div><p className="text-sm">{invoice.customer} · {invoice.rental}</p><p className="text-xs text-muted-foreground">Issued {date(invoice.issuedAt)} · Due {date(invoice.dueAt)}</p></div><div className="text-left sm:text-right"><p className="font-semibold">{money.format(invoice.balance)}</p><p className="text-xs text-muted-foreground">of {money.format(invoice.total)}</p></div></article>)}{!data.invoices.length && <p className="py-12 text-center text-sm text-muted-foreground">No invoices have been issued.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Recent collections</CardTitle><CardDescription>Latest posted payment facts.</CardDescription></CardHeader><CardContent className="space-y-2">{data.payments.map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{payment.number}</p><p className="text-xs text-muted-foreground">{payment.customer} · {payment.method.replaceAll("_", " ")} · {date(payment.collectedAt)}</p></div><p className="font-semibold text-emerald-500">{money.format(payment.amount)}</p></div>)}{!data.payments.length && <p className="py-12 text-center text-sm text-muted-foreground">No collections have been posted.</p>}</CardContent></Card>
    </div>
  </div>;
}
