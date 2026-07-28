"use client";

import { motion } from "framer-motion";
import { Info, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { NotificationItem } from "@/types";

interface NotificationCardProps {
  notification: NotificationItem;
  onRead?: (id: string) => void;
  onAction?: (id: string) => void;
  className?: string;
  index?: number;
}

const typeMap = {
  info: {
    icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  success: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  error: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
};

export function NotificationCard({
  notification,
  onRead,
  onAction,
  className,
  index = 0,
}: NotificationCardProps) {
  const typeConfig = typeMap[notification.type] || typeMap.info;
  const Icon = typeConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card
        className={cn(
          "p-4 relative transition-all duration-200 hover:bg-muted/10 border-l-4",
          notification.read ? "border-l-transparent" : "border-l-primary bg-primary/[0.02]",
          className
        )}
      >
        <div className="flex gap-3">
          <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg shrink-0", typeConfig.bg)}>
            <Icon className={cn("w-4 h-4", typeConfig.color)} />
          </div>
          
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className={cn("text-sm font-medium", !notification.read && "font-semibold")}>
                {notification.title}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatRelativeTime(notification.timestamp)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-normal">
              {notification.message}
            </p>
            
            {(onRead || onAction || notification.actionUrl) && (
              <div className="flex items-center gap-2 pt-2">
                {onAction && (
                  <Button variant="secondary" size="sm" className="h-7 text-xs px-2.5" onClick={() => onAction(notification.id)}>
                    View Details
                  </Button>
                )}
                {!notification.read && onRead && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground" onClick={() => onRead(notification.id)}>
                    Mark as read
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
