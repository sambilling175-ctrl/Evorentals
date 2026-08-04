import { FleetWorkspace } from "@/components/fleet/fleet-workspace";
import { getFleetWorkspace } from "@/lib/services/fleet";

export default async function FleetPage() {
  const data = await getFleetWorkspace();
  return (
    <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Fleet operations</p><h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Fleet Management</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Live vehicle directory with availability derived from active rentals and vehicle status.</p></div><FleetWorkspace data={data} /></div>
  );
}
