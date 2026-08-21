"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function ReportsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Reports unavailable"
      message="The live report session could not be refreshed. Try again to reload the operational summaries."
      onRetry={reset}
    />
  );
}
