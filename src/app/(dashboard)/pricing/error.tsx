"use client";
import { ErrorState } from "@/components/feedback/error-state";
export default function PricingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <ErrorState title="Pricing unavailable" message="Pricing plans could not be loaded or your role does not have access." onRetry={reset} />; }
