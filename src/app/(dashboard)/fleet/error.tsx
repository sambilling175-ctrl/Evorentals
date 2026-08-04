"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function FleetError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState title="Fleet unavailable" message="The vehicle directory could not be loaded or your role does not have access." onRetry={reset} />;
}
