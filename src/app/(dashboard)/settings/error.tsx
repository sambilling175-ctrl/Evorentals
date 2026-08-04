"use client";

import { ErrorState } from "@/components/feedback/error-state";

export default function SettingsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState title="Settings unavailable" message="The live company configuration could not be loaded. Your existing settings were not changed." onRetry={reset} />;
}
