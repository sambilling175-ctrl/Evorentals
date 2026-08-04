"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function EmployeesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState title="Employees unavailable" message="The employee directory could not be loaded or your role does not have access." onRetry={reset} />;
}
