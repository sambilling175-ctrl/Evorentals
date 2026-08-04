import { Skeleton } from "@/components/ui/skeleton";

export default function FleetLoading() {
  return <div className="space-y-6" aria-label="Loading fleet"><div className="space-y-3"><Skeleton className="h-3 w-32" /><Skeleton className="h-9 w-52" /><Skeleton className="h-4 max-w-2xl" /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-24" />)}</div><Skeleton className="h-10 w-72" /><Skeleton className="h-96 rounded-xl" /></div>;
}
