import Link from "next/link";
import { CalendarCheck, ChevronRight, FileText, Plus, UserPlus, Zap } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/services/auth";
import { getDashboardOverview } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { LiveMetricCard } from "@/components/dashboard/live-metric-card";
import { KycOverview } from "@/components/dashboard/kyc-overview";
import { ModuleReadiness } from "@/components/dashboard/module-readiness";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const quickActions = [
  { label: "Add customer", helper: "Register and start KYC", href: "/customers", icon: UserPlus, tone: "bg-emerald-500/10 text-emerald-500" },
  { label: "New booking", helper: "Booking workflow foundation", href: "/bookings", icon: CalendarCheck, tone: "bg-blue-500/10 text-blue-500" },
  { label: "Add vehicle", helper: "Fleet registration foundation", href: "/fleet", icon: Zap, tone: "bg-purple-500/10 text-purple-500" },
  { label: "Record payment", helper: "Collections foundation", href: "/payments", icon: FileText, tone: "bg-amber-500/10 text-amber-500" },
];

export default async function DashboardPage() {
  const [overview, user] = await Promise.all([getDashboardOverview(), getCurrentUserProfile()]);

  return <div className="space-y-5">
    <PageHeader title="Operations dashboard" description={`Welcome back, ${user?.fullName ?? "team member"}. Live customer readiness and delivery status.`}>
      <Button variant="outline" size="sm" className="gap-2" disabled><CalendarCheck className="h-4 w-4" />Updated {formatTime(overview.generatedAt)}</Button>
    </PageHeader>

    <section aria-label="Live dashboard metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {overview.metrics.map((metric) => <LiveMetricCard key={metric.key} metric={metric} />)}
    </section>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
      <Card className="overflow-hidden border-border/80 bg-card/90 shadow-[0_18px_50px_-36px_rgba(37,99,235,0.7)]">
        <CardHeader className="flex-row items-center justify-between border-b border-border/70 p-4"><div><CardTitle className="text-base">Recent customers</CardTitle><p className="mt-1 text-xs text-muted-foreground">Newest live registrations and KYC state</p></div><Button asChild variant="ghost" size="sm"><Link href="/customers">View all<ChevronRight className="h-4 w-4" /></Link></Button></CardHeader>
        <CardContent className="p-0">
          {overview.recentCustomers.length > 0 ? <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead className="bg-muted/30 text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-4 py-3 font-semibold">Customer</th><th className="px-4 py-3 font-semibold">Mobile</th><th className="px-4 py-3 font-semibold">KYC</th><th className="px-4 py-3 font-semibold">Registered</th><th className="w-10 px-4 py-3"><span className="sr-only">Open</span></th></tr></thead><tbody className="divide-y divide-border/70">{overview.recentCustomers.map((customer) => <tr key={customer.id} className="group transition-colors hover:bg-primary/[0.035]"><td className="px-4 py-3"><Link href={`/customers/${customer.id}`} className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><p className="text-sm font-semibold group-hover:text-primary">{customer.fullName}</p><p className="font-mono text-[11px] text-muted-foreground">{customer.customerNumber}</p></Link></td><td className="px-4 py-3 text-xs text-muted-foreground">{customer.phone ?? "Not provided"}</td><td className="px-4 py-3"><StatusBadge status={customer.kycStatus} /></td><td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(customer.createdAt)}</td><td className="px-4 py-3"><Button asChild size="icon" variant="ghost" className="h-8 w-8"><Link href={`/customers/${customer.id}`} aria-label={`Open ${customer.fullName}`}><ChevronRight className="h-4 w-4" /></Link></Button></td></tr>)}</tbody></table></div> : <EmptyDashboard title="No customers yet" description="Register the first customer to populate this live dashboard." />}
        </CardContent>
      </Card>
      <KycOverview kyc={overview.kyc} />
    </div>

    <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.7fr)_minmax(0,1.3fr)]">
      <Card className="border-border/80 bg-card/90"><CardHeader className="border-b border-border/70 p-4"><CardTitle className="text-base">Quick actions</CardTitle><p className="text-xs text-muted-foreground">Start common operational workflows</p></CardHeader><CardContent className="grid grid-cols-2 gap-3 p-4">{quickActions.map(({ label, helper, href, icon: Icon, tone }) => <Link key={label} href={href} className="group rounded-xl border border-border/70 bg-muted/10 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></div><p className="mt-3 text-sm font-semibold">{label}</p><p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{helper}</p></Link>)}</CardContent></Card>

      <Card className="border-border/80 bg-card/90"><CardHeader className="border-b border-border/70 p-4"><CardTitle className="text-base">Recent customer activity</CardTitle><p className="text-xs text-muted-foreground">Append-only profile and KYC events</p></CardHeader><CardContent className="p-4">{overview.recentActivity.length > 0 ? <ol className="relative ml-2 space-y-5 border-l border-border pl-5">{overview.recentActivity.map((event) => <li key={event.id} className="relative"><span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-cyan-500 ring-4 ring-card" /><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold">{event.summary}</p><p className="text-xs capitalize text-muted-foreground">{event.eventType.replaceAll("_", " ")}</p></div><time className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</time></div></li>)}</ol> : <EmptyDashboard title="No activity yet" description="Customer profile and KYC changes will appear here." />}</CardContent></Card>
    </div>

    <ModuleReadiness />
  </div>;
}

function EmptyDashboard({ title, description }: { title: string; description: string }) { return <div className="grid place-items-center px-4 py-12 text-center"><div className="grid h-10 w-10 place-items-center rounded-full bg-muted"><Plus className="h-4 w-4 text-muted-foreground" /></div><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function formatTime(value: string) { return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
