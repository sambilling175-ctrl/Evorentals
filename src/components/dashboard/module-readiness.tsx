import Link from "next/link";
import { Bike, CalendarCheck, CircleDashed, IndianRupee, KeyRound, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  { label: "Fleet & availability", href: "/fleet", icon: Bike },
  { label: "Bookings", href: "/bookings", icon: CalendarCheck },
  { label: "Rental lifecycle", href: "/rentals", icon: KeyRound },
  { label: "Collections", href: "/payments", icon: IndianRupee },
  { label: "Service", href: "/service", icon: Wrench },
];

export function ModuleReadiness() {
  return <Card className="border-border/80 bg-card/90"><CardHeader className="border-b border-border/70 p-4"><CardTitle className="text-base">Operational modules</CardTitle><p className="text-xs text-muted-foreground">Visible roadmap areas awaiting live backend contracts</p></CardHeader><CardContent className="divide-y divide-border/70 p-0">{modules.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><div className="grid h-9 w-9 place-items-center rounded-lg bg-muted/50"><Icon className="h-4 w-4 text-muted-foreground" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{label}</p><p className="text-[11px] text-muted-foreground">Contract ready · operational data pending</p></div><CircleDashed className="h-4 w-4 text-amber-500" aria-label="Pending backend" /></Link>)}</CardContent></Card>;
}
