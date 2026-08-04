import { Skeleton } from "@/components/ui/skeleton";
export default function Loading(){return <div className="space-y-5"><Skeleton className="h-24 w-full"/><div className="grid gap-3 sm:grid-cols-4">{Array.from({length:4},(_,i)=><Skeleton key={i} className="h-24"/>)}</div><Skeleton className="h-80 w-full"/></div>}
