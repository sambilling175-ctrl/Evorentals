"use client";

import { Button } from "@/components/ui/button";

export default function ServiceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"><h2 className="text-lg font-semibold">Service operations unavailable</h2><p className="mt-2 text-sm text-muted-foreground">The service workspace could not be loaded.</p><Button className="mt-5" onClick={() => reset()}>Try again</Button></div>;
}
