"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  progress?: number;
  color?: "blue" | "green" | "purple" | "orange" | "red" | "cyan";
  className?: string;
  index?: number;
}

const colorMap = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    progress: "bg-blue-500",
    border: "border-blue-500/20",
  },
  green: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    progress: "bg-emerald-500",
    border: "border-emerald-500/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    progress: "bg-purple-500",
    border: "border-purple-500/20",
  },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    progress: "bg-orange-500",
    border: "border-orange-500/20",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    progress: "bg-red-500",
    border: "border-red-500/20",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    progress: "bg-cyan-500",
    border: "border-cyan-500/20",
  },
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  progress,
  color = "blue",
  className,
  index = 0,
}: MetricCardProps) {
  const colors = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="w-full"
    >
      <Card className={cn("p-5 border-l-4 card-hover", colors.border, className)}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </span>
            <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
          </div>
          {Icon && (
            <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg", colors.bg)}>
              <Icon className={cn("w-4 h-4", colors.text)} />
            </div>
          )}
        </div>

        {progress !== undefined && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="font-semibold text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {description && !progress && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
            {description}
          </p>
        )}
      </Card>
    </motion.div>
  );
}
