"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/charts/sparkline";

interface KPICardProps {
  title: string;
  value: string | number;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
  icon: LucideIcon;
  color: "blue" | "green" | "purple" | "orange" | "red" | "cyan";
  sparklineData?: number[];
  prefix?: string;
  suffix?: string;
  index?: number;
}

const colorMap = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    shadow: "shadow-blue-500/10",
    gradient: "from-blue-500 to-blue-600",
  },
  green: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    shadow: "shadow-emerald-500/10",
    gradient: "from-emerald-500 to-emerald-600",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    shadow: "shadow-purple-500/10",
    gradient: "from-purple-500 to-purple-600",
  },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    shadow: "shadow-orange-500/10",
    gradient: "from-orange-500 to-orange-600",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    shadow: "shadow-red-500/10",
    gradient: "from-red-500 to-red-600",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    shadow: "shadow-cyan-500/10",
    gradient: "from-cyan-500 to-cyan-600",
  },
};

export function KPICard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color,
  sparklineData,
  prefix = "",
  suffix = "",
  index = 0,
}: KPICardProps) {
  const colors = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="card-hover p-5 relative overflow-hidden group">
        {/* Background glow */}
        <div
          className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-500 -translate-y-1/2 translate-x-1/2",
            colors.bg
          )}
        />

        <div className="relative flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl",
                  colors.bg
                )}
              >
                <Icon className={cn("w-5 h-5", colors.text)} />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {title}
              </span>
            </div>

            <div className="flex items-end gap-3">
              <div className="text-2xl font-bold tracking-tight">
                {prefix}
                {value}
                {suffix}
              </div>

              <div
                className={cn(
                  "flex items-center gap-0.5 text-xs font-medium pb-0.5",
                  changeType === "increase" && "text-emerald-500",
                  changeType === "decrease" && "text-red-500",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              >
                {changeType === "increase" && (
                  <TrendingUp className="w-3.5 h-3.5" />
                )}
                {changeType === "decrease" && (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {changeType === "neutral" && (
                  <Minus className="w-3.5 h-3.5" />
                )}
                <span>
                  {changeType === "increase" ? "+" : ""}
                  {change}%
                </span>
              </div>
            </div>
          </div>

          {/* Sparkline */}
          {sparklineData && sparklineData.length > 0 && (
            <div className="w-24 h-12 self-end">
              <Sparkline
                data={sparklineData}
                color={
                  color === "blue"
                    ? "#3B82F6"
                    : color === "green"
                    ? "#10B981"
                    : color === "purple"
                    ? "#8B5CF6"
                    : color === "orange"
                    ? "#F59E0B"
                    : color === "red"
                    ? "#EF4444"
                    : "#06B6D4"
                }
              />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
