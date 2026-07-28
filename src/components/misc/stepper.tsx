"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  orientation = "horizontal",
  className,
}: StepperProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      className={cn(
        "flex w-full",
        isHorizontal ? "flex-row items-center justify-between" : "flex-col items-start gap-4",
        className
      )}
    >
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isActive = idx === currentStep;

        return (
          <div
            key={step.title}
            className={cn(
              "flex items-center",
              isHorizontal ? "flex-1 last:flex-initial" : "flex-row w-full"
            )}
          >
            {/* Step wrapper */}
            <div className="flex items-center gap-3">
              {/* Indicator Circle */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold shrink-0 transition-all duration-300",
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isActive
                    ? "border-primary text-primary ring-4 ring-primary/10"
                    : "border-border text-muted-foreground bg-card"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Title & Description */}
              <div className="text-left">
                <p
                  className={cn(
                    "text-sm font-semibold transition-colors duration-300",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{step.description}</p>
                )}
              </div>
            </div>

            {/* Connecting line */}
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "transition-all duration-300",
                  isHorizontal
                    ? "flex-1 h-[2px] mx-4 bg-border"
                    : "w-[2px] h-8 bg-border ml-4 my-2"
                )}
              >
                <div
                  className={cn(
                    "h-full bg-primary transition-all duration-500",
                    isCompleted ? "w-full h-full" : "w-0 h-0"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
