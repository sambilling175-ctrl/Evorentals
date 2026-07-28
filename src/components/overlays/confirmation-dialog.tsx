"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  requireConfirmText?: string; // If specified, require typing this string
  variant?: "destructive" | "warning" | "default";
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  requireConfirmText,
  variant = "destructive",
}: ConfirmationDialogProps) {
  const [typedText, setTypedText] = React.useState("");

  const isValid = !requireConfirmText || typedText === requireConfirmText;
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setTypedText("");
    onOpenChange(nextOpen);
  };

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm();
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-row items-start gap-4">
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
              variant === "destructive" && "bg-red-500/10 text-red-500",
              variant === "warning" && "bg-amber-500/10 text-amber-500",
              variant === "default" && "bg-blue-500/10 text-blue-500"
            )}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1 text-left">
            <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        {requireConfirmText && (
          <div className="space-y-2 mt-2">
            <p className="text-xs text-muted-foreground">
              Please type <span className="font-bold text-foreground">{requireConfirmText}</span> to confirm:
            </p>
            <Input
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder={requireConfirmText}
              className="h-9"
            />
          </div>
        )}

        <DialogFooter className="mt-4 flex flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : variant === "warning" ? "warning" : "default"}
            size="sm"
            onClick={handleConfirm}
            disabled={!isValid}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
