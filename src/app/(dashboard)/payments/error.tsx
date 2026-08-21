"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function PaymentsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Collections unavailable"
      message="The collections session could not be refreshed. Try again to reload the live ledger."
      onRetry={reset}
    />
  );
}
