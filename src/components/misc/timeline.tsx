"use client";

import { motion } from "framer-motion";
import { type LucideIcon, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon?: LucideIcon;
  color?: "blue" | "green" | "purple" | "orange" | "red";
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const colorClasses = {
  blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  green: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  red: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function Timeline({ events, className }: TimelineProps) {
  return (
    <div className={cn("space-y-6 relative pl-6", className)}>
      {/* Central Connector Line */}
      <div className="absolute left-[9px] top-1.5 bottom-1.5 w-[2px] bg-border" />

      {events.map((event, idx) => {
        const Icon = event.icon;
        const colorConfig = event.color ? colorClasses[event.color] : "bg-muted text-muted-foreground border-border";

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="relative flex flex-col gap-1.5"
          >
            {/* Timeline node */}
            <div className="absolute -left-6 flex items-center justify-center">
              <div
                className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full border bg-card z-10",
                  colorConfig
                )}
              >
                {Icon ? <Icon className="w-3 h-3" /> : <Circle className="w-2 h-2 fill-current" />}
              </div>
            </div>

            {/* Event Content */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <p className="text-sm font-semibold text-foreground">{event.title}</p>
              <span className="text-xs text-muted-foreground shrink-0">{event.timestamp}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-normal">{event.description}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
