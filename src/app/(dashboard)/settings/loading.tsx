import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6" aria-label="Loading settings">
      <div className="space-y-3"><Skeleton className="h-3 w-32" /><Skeleton className="h-9 w-48" /><Skeleton className="h-4 max-w-2xl" /></div>
      <Skeleton className="h-10 w-full max-w-xl" />
      <div className="rounded-xl border border-border p-6"><Skeleton className="h-6 w-44" /><Skeleton className="mt-3 h-4 w-80 max-w-full" /><div className="mt-8 grid gap-4 md:grid-cols-2">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-16" />)}</div></div>
    </div>
  );
}
