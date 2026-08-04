import Link from "next/link";
import { Bike, ChevronRight, Clock3, KeyRound, PackageCheck, Users, type LucideIcon } from "lucide-react";
import type { DashboardMetric } from "@/lib/services/dashboard";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const icons: Record<DashboardMetric["key"], LucideIcon> = { customers: Users, fleet: Bike, available: PackageCheck, activeRentals: KeyRound, pendingKyc: Clock3 };
const tones: Record<DashboardMetric["tone"], string> = {
  blue: "border-blue-500/20 bg-blue-500/10 text-blue-500",
  green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-500",
  red: "border-red-500/20 bg-red-500/10 text-red-500",
  purple: "border-purple-500/20 bg-purple-500/10 text-purple-500",
};

export function LiveMetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = icons[metric.key];
  return <Link href={metric.href} className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Card className="h-full overflow-hidden border-border/80 bg-card/90 transition-colors group-hover:border-primary/30"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-medium text-muted-foreground">{metric.label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{metric.value.toLocaleString("en-IN")}</p><p className="mt-1 text-[11px] text-muted-foreground">{metric.helper}</p></div><div className="flex items-center gap-3"><div className={cn("grid h-11 w-11 place-items-center rounded-xl border", tones[metric.tone])}><Icon className="h-5 w-5" /></div><ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" /></div></CardContent></Card></Link>;
}
