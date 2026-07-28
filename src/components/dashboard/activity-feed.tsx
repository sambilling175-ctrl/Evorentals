"use client";

import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import type { ActivityItem } from "@/types";

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxHeight?: number;
}

const typeColors: Record<string, string> = {
  booking: "bg-blue-500",
  payment: "bg-emerald-500",
  vehicle: "bg-purple-500",
  customer: "bg-cyan-500",
  service: "bg-orange-500",
  system: "bg-zinc-500",
};

export function ActivityFeed({ activities, maxHeight = 400 }: ActivityFeedProps) {
  return (
    <ScrollArea className="pr-4" style={{ maxHeight }}>
      <div className="relative space-y-0">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-border" />

        {activities.map((activity) => (
          <div
            key={activity.id}
            className="relative flex gap-3 pb-6 last:pb-0"
          >
            {/* Timeline dot */}
            <div className="relative z-10 flex shrink-0">
              <Avatar className="h-10 w-10 border-2 border-background">
                <AvatarFallback
                  className={cn(
                    "text-[11px] font-bold text-white",
                    typeColors[activity.type] || "bg-zinc-500"
                  )}
                >
                  {getInitials(activity.user.name)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm">
                <span className="font-medium">{activity.user.name}</span>{" "}
                <span className="text-muted-foreground">{activity.action}</span>{" "}
                <span className="font-medium">{activity.target}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatRelativeTime(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
