"use client";

import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { CHART_COLOR_ARRAY } from "@/lib/constants";

interface PieChartProps {
  data: { name: string; value: number }[];
  colors?: string[];
  showLegend?: boolean;
}

export function PieChart({
  data,
  colors = CHART_COLOR_ARRAY,
  showLegend = true,
}: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={80}
          dataKey="value"
          labelLine={false}
          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
          animationDuration={1000}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.75rem",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            fontSize: "0.875rem",
          }}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
