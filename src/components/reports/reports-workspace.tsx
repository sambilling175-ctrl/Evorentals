"use client";

import { Download, FileBarChart, Search } from "lucide-react";
import type { ReportMetric, ReportRow, ReportsOverview } from "@/lib/services/reports";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const date = (value: string) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value)) : "—";

export function ReportsWorkspace({ data }: { data: ReportsOverview }) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => data.rows.filter((row) => `${row.reference} ${row.customer} ${row.vehicle} ${row.status}`.toLowerCase().includes(query.toLowerCase())), [data.rows, query]);
  return <div className="space-y-5">
    <PageHeader title="Reports & analytics" description="Live operational summaries from rentals, fleet, customers, collections, and settlement history.">
      <Button variant="outline" className="gap-2" onClick={() => downloadCsv(data.rows)}><Download className="h-4 w-4" />Export CSV</Button>
    </PageHeader>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{data.metrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}</div>
    <Card className="overflow-hidden"><CardHeader className="gap-3 border-b p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><FileBarChart className="h-4 w-4 text-primary" />Operational report rows</CardTitle><p className="mt-1 text-xs text-muted-foreground">Generated {date(data.generatedAt)} · {data.rows.length} rows available for export</p></div><div className="relative w-full lg:w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reference, customer or vehicle" aria-label="Search report rows" className="pl-9" /></div></div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="bg-muted/30 text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Vehicle / rental</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Date</th></tr></thead><tbody className="divide-y divide-border/70">{rows.map((row) => <ReportTableRow key={`${row.report}-${row.id}`} row={row} />)}</tbody></table></div>{rows.length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">No report rows match your search.</p> : null}</CardContent></Card>
  </div>;
}

function MetricCard({ metric }: { metric: ReportMetric }) { return <Card><CardContent className="p-4"><p className="text-2xl font-bold">{metric.format === "currency" ? money.format(metric.value) : metric.value.toLocaleString("en-IN")}</p><p className="mt-1 text-sm font-medium">{metric.label}</p><p className="mt-1 text-xs text-muted-foreground">{metric.helper}</p></CardContent></Card>; }
function ReportTableRow({ row }: { row: ReportRow }) { return <tr className="hover:bg-muted/20"><td className="px-4 py-3 text-xs capitalize text-muted-foreground">{row.report}</td><td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{row.reference}</td><td className="px-4 py-3 text-sm">{row.customer}</td><td className="px-4 py-3 text-xs text-muted-foreground">{row.vehicle}</td><td className="px-4 py-3"><StatusBadge status={row.status} /></td><td className="px-4 py-3 text-right text-sm font-semibold">{row.amount > 0 ? money.format(row.amount) : "—"}</td><td className="px-4 py-3 text-xs text-muted-foreground">{date(row.occurredAt)}</td></tr>; }
function downloadCsv(rows: ReportRow[]) {
  const header = ["type", "reference", "customer", "vehicle_or_rental", "status", "amount", "occurred_at"];
  const csv = [header, ...rows.map((row) => [row.report, row.reference, row.customer, row.vehicle, row.status, row.amount.toFixed(2), row.occurredAt])]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `evo-rentals-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 0);
}
