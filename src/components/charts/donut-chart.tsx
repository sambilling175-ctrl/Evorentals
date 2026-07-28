"use client";

import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { CHART_COLOR_ARRAY } from "@/lib/constants";

interface DonutChartProps {
  data: { name: string; value: number }[];
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

export function DonutChart({
  data,
  colors = CHART_COLOR_ARRAY,
  innerRadius = 60,
  outerRadius = 90,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
          animationDuration={1000}
          animationBegin={200}
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
        {/* Center Label */}
        {(centerLabel || centerValue) && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {centerValue && (
              <tspan
                x="50%"
                dy="-8"
                className="fill-foreground text-xl font-bold"
              >
                {centerValue}
              </tspan>
            )}
            {centerLabel && (
              <tspan
                x="50%"
                dy={centerValue ? "22" : "0"}
                className="fill-muted-foreground text-xs"
              >
                {centerLabel}
              </tspan>
            )}
          </text>
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
