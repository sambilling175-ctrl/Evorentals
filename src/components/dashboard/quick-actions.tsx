"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: "blue" | "green" | "purple" | "orange";
}

interface QuickActionsProps {
  actions: QuickAction[];
}

const actionColors = {
  blue: "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20",
  green: "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20",
  purple: "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20",
  orange: "bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20",
};

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Link
              href={action.href}
              className="group flex flex-col items-center gap-2.5 rounded-xl border border-border bg-card p-4 text-center transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                  actionColors[action.color]
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{action.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {action.description}
                </p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
