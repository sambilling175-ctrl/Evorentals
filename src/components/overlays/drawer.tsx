"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
  className?: string;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  className,
}: DrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={cn("flex flex-col h-full sm:max-w-md", className)}>
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl font-bold tracking-tight">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-sm text-muted-foreground mt-1">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-2 -mx-6 px-6">
          {children}
        </div>

        {footer && <SheetFooter className="pt-4 border-t border-border">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}
