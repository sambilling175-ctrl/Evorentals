"use client";

import * as React from "react";
import { WifiOff, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OfflinePage() {
  const [checking, setChecking] = React.useState(false);

  const handleRetry = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      if (typeof window !== "undefined" && window.navigator.onLine) {
        window.location.reload();
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="relative">
            <div className="text-[120px] font-bold leading-none text-muted-foreground/10 select-none">
              Offline
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
                <WifiOff className="w-10 h-10 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">No internet connection</h1>
          <p className="text-muted-foreground">
            Please check your network cables, Wi-Fi connections, and try again.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={handleRetry} disabled={checking}>
            <RotateCcw className={cn("w-4 h-4 mr-2", checking && "animate-spin")} />
            {checking ? "Checking..." : "Try again"}
          </Button>
          <Button asChild>
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
