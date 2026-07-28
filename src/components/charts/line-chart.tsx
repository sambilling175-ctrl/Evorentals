"use client";

import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";

interface LineChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
}

export function LineChart({
  data,
  xKey,
  yKeys,
  colors = Object.values(CHART_COLORS),
  showGrid = true,
  showLegend = false,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
        {showLegend && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />}
        {yKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[i % colors.length]}
            strokeWidth={3}
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
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
