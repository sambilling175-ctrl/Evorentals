import { Skeleton } from "@/components/ui/skeleton";
export default function PricingLoading() { return <div className="space-y-6" aria-label="Loading pricing"><Skeleton className="h-20 max-w-2xl" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({length:5},(_,i)=><Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-96 rounded-xl" /></div>; }
