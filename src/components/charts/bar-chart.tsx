"use client";

import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";

interface BarChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  stacked?: boolean;
  showGrid?: boolean;
  layout?: "horizontal" | "vertical";
  barRadius?: number;
}

export function BarChart({
  data,
  xKey,
  yKeys,
  colors = Object.values(CHART_COLORS),
  stacked = false,
  showGrid = true,
  layout = "horizontal",
  barRadius = 6,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart
        data={data}
        layout={layout === "vertical" ? "vertical" : "horizontal"}
        margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
            vertical={false}
          />
        )}
        <XAxis
          dataKey={layout === "vertical" ? undefined : xKey}
          type={layout === "vertical" ? "number" : "category"}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <YAxis
          dataKey={layout === "vertical" ? xKey : undefined}
          type={layout === "vertical" ? "category" : "number"}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.75rem",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            fontSize: "0.875rem",
          }}
          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
        />
        {yKeys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[i % colors.length]}
            stackId={stacked ? "1" : undefined}
            radius={[barRadius, barRadius, 0, 0]}
            animationDuration={1200}
            maxBarSize={50}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
