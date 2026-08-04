import { PricingWorkspace } from "@/components/pricing/pricing-workspace";
import { getPricingWorkspace } from "@/lib/services/pricing";

export default async function PricingPage() {
  const data = await getPricingWorkspace();
  return <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Rental configuration</p><h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Pricing Plans</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Manage company rate cards and generate server-verified rental quotes in INR.</p></div><PricingWorkspace data={data} /></div>;
}
