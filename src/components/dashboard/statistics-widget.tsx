"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: string | number;
  subValue?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  color?: string;
}

interface StatisticsWidgetProps {
  title: string;
  subtitle?: string;
  stats: StatItem[];
  layout?: "horizontal" | "vertical";
  className?: string;
}

export function StatisticsWidget({
  title,
  subtitle,
  stats,
  layout = "horizontal",
  className,
}: StatisticsWidgetProps) {
  return (
    <Card className={cn("w-full overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "flex gap-4",
            layout === "horizontal"
              ? "flex-col sm:flex-row sm:items-center justify-between"
              : "flex-col"
          )}
        >
          {stats.map((stat, index) => (
            <Fragment key={stat.label}>
              {index > 0 && (
                <Separator
                  orientation={layout === "horizontal" ? "vertical" : "horizontal"}
                  className={cn(
                    layout === "horizontal" ? "hidden sm:block h-8 self-center" : "w-full"
                  )}
                />
              )}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                className="flex-1 space-y-1"
              >
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {stat.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
                  {stat.change && (
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        stat.changeType === "positive" && "text-emerald-500",
                        stat.changeType === "negative" && "text-red-500",
                        stat.changeType === "neutral" && "text-muted-foreground"
                      )}
                    >
                      {stat.change}
                    </span>
                  )}
                </div>
                {stat.subValue && (
                  <p className="text-[11px] text-muted-foreground">{stat.subValue}</p>
                )}
              </motion.div>
            </Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
