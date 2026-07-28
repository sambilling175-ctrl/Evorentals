import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        config.className,
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          config.className.includes("emerald") && "bg-emerald-500",
          config.className.includes("amber") && "bg-amber-500",
          config.className.includes("blue") && "bg-blue-500",
          config.className.includes("red") && "bg-red-500",
          config.className.includes("purple") && "bg-purple-500",
          config.className.includes("orange") && "bg-orange-500",
          config.className.includes("cyan") && "bg-cyan-500",
          config.className.includes("zinc") && "bg-zinc-500"
        )}
      />
      {config.label}
    </span>
  );
}
