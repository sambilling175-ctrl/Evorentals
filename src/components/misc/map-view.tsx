"use client";

import * as React from "react";
import { Pin, Battery, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MapViewProps {
  apiKey?: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

export function MapView({ apiKey, center = { lat: 12.9716, lng: 77.5946 }, zoom = 12, className }: MapViewProps) {
  // If API key is provided, we would load the Google Maps Script.
  // For the UI Foundation showcase, we display an premium mockup map showing active scooters.
  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-muted/40 overflow-hidden flex flex-col justify-between p-4 min-h-[300px]",
        className
      )}
    >
      <span className="sr-only">
        Map centered at {center.lat}, {center.lng}, zoom level {zoom}.
      </span>
      {/* Premium Dot Map Background Grid */}
      <div className="absolute inset-0 dot-pattern opacity-40 select-none pointer-events-none" />

      {/* Top Controls Overlay */}
      <div className="relative z-10 flex items-center justify-between gap-4 w-full pointer-events-none">
        <Badge className="bg-primary shadow-lg pointer-events-auto gap-1.5 py-1 px-2.5">
          <Compass className="w-3.5 h-3.5 animate-spin-slow" />
          <span>Live Fleet Tracker</span>
        </Badge>
        
        <div className="flex gap-2 pointer-events-auto">
          <div className="h-8 px-3 rounded-lg border border-border bg-card flex items-center gap-1.5 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>186 Active Scooters</span>
          </div>
        </div>
      </div>

      {/* Fake Map Markers / Interactive Scooters */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Scooters pins */}
        <div className="absolute top-1/4 left-1/3 pointer-events-auto group cursor-pointer">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-emerald-500/30 animate-ping" />
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white shadow-lg">
              <Pin className="w-4 h-4" />
            </div>
            
            {/* Popover on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 hidden group-hover:block bg-card border border-border rounded-lg p-2 shadow-2xl text-[10px] space-y-1">
              <p className="font-semibold text-foreground truncate">Ather 450X</p>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Battery className="w-3 h-3 text-emerald-500" /> 84%
                </span>
                <span>Moving</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-1/2 left-2/3 pointer-events-auto group cursor-pointer">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-amber-500/30 animate-ping" />
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white shadow-lg">
              <Pin className="w-4 h-4" />
            </div>
            
            {/* Popover on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 hidden group-hover:block bg-card border border-border rounded-lg p-2 shadow-2xl text-[10px] space-y-1">
              <p className="font-semibold text-foreground truncate">Ola S1 Pro</p>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Battery className="w-3 h-3 text-amber-500" /> 38%
                </span>
                <span>Low Battery</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls / Status */}
      <div className="relative z-10 w-full flex justify-between items-end">
        <div className="text-[10px] text-muted-foreground max-w-[200px] leading-normal bg-card/60 backdrop-blur-md p-1.5 rounded border border-border">
          {apiKey ? (
            <span>Google Maps SDK loaded</span>
          ) : (
            <span>Google Maps API ready. Stub showing active live mock.</span>
          )}
        </div>
      </div>
    </div>
  );
}
