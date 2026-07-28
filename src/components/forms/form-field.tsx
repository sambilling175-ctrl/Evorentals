"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  required?: boolean;
  helpText?: string;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ children, label, error, required, helpText, className, ...props }, ref) => {
    // Generate unique ID if child doesn't have one to connect label for accessibility
    const child = React.Children.only(children) as React.ReactElement<{ id?: string; name?: string; className?: string }>;
    const id = child.props.id || child.props.name;

    return (
      <div ref={ref} className={cn("space-y-1.5 w-full", className)} {...props}>
        {label && (
          <Label htmlFor={id} className={cn(error && "text-destructive", "flex items-center gap-1 font-semibold")}>
            {label}
            {required && <span className="text-destructive font-bold">*</span>}
          </Label>
        )}
        
        {/* Inject error class or props if child is a standard Input/Select */}
        {React.cloneElement(child, {
          className: cn(
            child.props.className,
            error && "border-destructive focus-visible:ring-destructive"
          ),
        })}

        {error && (
          <p className="text-xs font-semibold text-destructive animate-fade-in">
            {error}
          </p>
        )}

        {helpText && !error && (
          <p className="text-xs text-muted-foreground">
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";
