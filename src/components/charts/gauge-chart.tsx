"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GaugeChartProps {
  value: number; // 0 to 100
  title?: string;
  subtitle?: string;
  minLabel?: string;
  maxLabel?: string;
  color?: string;
  className?: string;
}

export function GaugeChart({
  value,
  title,
  subtitle,
  minLabel = "0%",
  maxLabel = "100%",
  color = "var(--color-primary)",
  className,
}: GaugeChartProps) {
  // Normalize value
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  
  // Angle for rotation (from -90 to +90 degrees)
  const rotationAngle = (normalizedValue / 100) * 180 - 90;

  // Path for the gauge track (180 degree semi-circle)
  // R=80, stroke=12, center at (100, 90)
  const radius = 70;
  const strokeWidth = 10;
  const cx = 100;
  const cy = 90;
  const circumference = Math.PI * radius; // Half circle circumference
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center justify-center p-4 bg-card rounded-xl border border-border", className)}>
      {title && <span className="text-sm font-semibold text-muted-foreground mb-1">{title}</span>}
      <div className="relative w-48 h-28">
        <svg className="w-full h-full" viewBox="0 0 200 110">
          {/* Track (Background) */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Progress fill */}
          <motion.path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />

          {/* Needle Pin */}
          <circle cx={cx} cy={cy} r="6" fill="hsl(var(--foreground))" />

          {/* Needle Line */}
          <motion.line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - radius + 15}
            stroke="hsl(var(--foreground))"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ rotate: -90 }}
            animate={{ rotate: rotationAngle }}
            style={{ originX: `${cx}px`, originY: `${cy}px` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>

        {/* Big value overlay */}
        <div className="absolute inset-x-0 bottom-2 flex flex-col items-center">
          <span className="text-3xl font-extrabold tracking-tight">{normalizedValue}%</span>
          {subtitle && <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{subtitle}</span>}
        </div>
      </div>

      {/* Min/Max Labels */}
      <div className="flex w-full justify-between px-6 text-[10px] text-muted-foreground font-semibold uppercase">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
