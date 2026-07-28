"use client";

import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";

interface AreaChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  stacked?: boolean;
  showGrid?: boolean;
}

export function AreaChart({
  data,
  xKey,
  yKeys,
  colors = Object.values(CHART_COLORS),
  stacked = false,
  showGrid = true,
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsAreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <defs>
          {yKeys.map((key, i) => (
            <linearGradient key={key} id={`area-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={0.25} />
              <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
            vertical={false}
          />
        )}
        <XAxis
          dataKey={xKey}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <YAxis
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
          itemStyle={{ color: "hsl(var(--muted-foreground))" }}
        />
        {yKeys.map((key, i) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[i % colors.length]}
            strokeWidth={2.5}
            fill={`url(#area-${key})`}
            stackId={stacked ? "1" : undefined}
            dot={false}
            activeDot={{
              r: 5,
              stroke: colors[i % colors.length],
              strokeWidth: 2,
              fill: "hsl(var(--card))",
            }}
            animationDuration={1200}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
