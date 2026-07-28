"use client";

import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
} from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function Sparkline({
  data,
  color = "#3B82F6",
  height = 48,
}: SparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={chartData}>
        <defs>
          <linearGradient id={`sparkline-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#sparkline-${color})`}
          dot={false}
          isAnimationActive={true}
          animationDuration={1000}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
