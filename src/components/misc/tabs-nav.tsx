"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface TabsNavProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function TabsNav({
  tabs,
  activeTab,
  onTabChange,
  className,
}: TabsNavProps) {
  return (
    <div className={cn("flex border-b border-border w-full overflow-x-auto", className)}>
      <div className="flex gap-6 min-w-max pb-[1px]">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 py-3 text-sm font-semibold transition-colors duration-200 cursor-pointer outline-none",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-colors duration-200",
                    isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}
              
              {/* Animated underline */}
              {isActive && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 inset-x-0 h-[2px] bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
