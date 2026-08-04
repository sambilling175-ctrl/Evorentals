import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { getSettingsOverview } from "@/lib/services/settings";

export default async function SettingsPage() {
  const settings = await getSettingsOverview();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Live configuration</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Manage company identity and the operational defaults used by rentals, collections, invoices, and regional formatting.</p>
      </div>
      <SettingsWorkspace settings={settings} />
    </div>
  );
}
