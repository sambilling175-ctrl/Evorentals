"use client";
import { ErrorState } from "@/components/feedback/error-state";
export default function Error({reset}:{error:Error;reset:()=>void}){return <ErrorState title="Rentals unavailable" message="Rental operations could not be loaded." onRetry={reset}/>}
