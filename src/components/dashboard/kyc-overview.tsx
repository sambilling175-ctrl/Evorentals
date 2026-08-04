import type { DashboardOverview } from "@/lib/services/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const segments = [
  { key: "verified", label: "Verified", color: "bg-emerald-500" },
  { key: "pending", label: "Pending", color: "bg-amber-500" },
  { key: "rejected", label: "Rejected", color: "bg-red-500" },
  { key: "expired", label: "Expired", color: "bg-purple-500" },
] as const;

export function KycOverview({ kyc }: { kyc: DashboardOverview["kyc"] }) {
  const total = Object.values(kyc).reduce((sum, value) => sum + value, 0);
  return <Card className="border-border/80 bg-card/90"><CardHeader className="border-b border-border/70 p-4"><CardTitle className="text-base">KYC readiness</CardTitle><p className="text-xs text-muted-foreground">Live distribution across customer verification states</p></CardHeader><CardContent className="space-y-5 p-4"><div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-label="KYC status distribution">{segments.map((segment) => <span key={segment.key} className={segment.color} style={{ width: `${ratio(kyc[segment.key], total)}%` }} title={`${segment.label}: ${kyc[segment.key]}`} />)}</div><div className="grid grid-cols-2 gap-3">{segments.map((segment) => <div key={segment.key} className="rounded-lg border border-border/70 bg-muted/15 p-3"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${segment.color}`} /><span className="text-xs text-muted-foreground">{segment.label}</span></div><p className="mt-1 text-lg font-bold">{kyc[segment.key].toLocaleString("en-IN")} <span className="text-[11px] font-normal text-muted-foreground">({ratio(kyc[segment.key], total)}%)</span></p></div>)}</div></CardContent></Card>;
}

function ratio(value: number, total: number) { return total === 0 ? 0 : Math.round((value / total) * 100); }
