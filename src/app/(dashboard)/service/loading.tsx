import { Card, CardContent } from "@/components/ui/card";

export default function ServiceLoading() {
  return <div className="space-y-6" aria-busy="true"><div className="h-10 w-72 animate-pulse rounded-lg bg-muted" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Card key={index}><CardContent className="h-24 animate-pulse p-4" /></Card>)}</div><Card><CardContent className="h-80 animate-pulse p-4" /></Card></div>;
}
