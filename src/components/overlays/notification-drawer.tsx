"use client";

import * as React from "react";
import { Drawer } from "@/components/overlays/drawer";
import { NotificationCard } from "@/components/dashboard/notification-card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import type { NotificationItem } from "@/types";

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: NotificationItem[];
  onMarkAllRead?: () => void;
  onMarkRead?: (id: string) => void;
  className?: string;
}

export function NotificationDrawer({
  open,
  onOpenChange,
  notifications,
  onMarkAllRead,
  onMarkRead,
  className,
}: NotificationDrawerProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Notifications"
      description={`You have ${unreadCount} unread notification(s)`}
      footer={
        onMarkAllRead && unreadCount > 0 ? (
          <Button variant="outline" size="sm" className="w-full gap-2 text-xs font-semibold" onClick={onMarkAllRead}>
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </Button>
        ) : null
      }
      className={className}
    >
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground space-y-3">
          <div className="p-3 bg-muted rounded-full">
            <Bell className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold">All caught up!</p>
          <p className="text-xs">No notifications at the moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif, idx) => (
            <NotificationCard
              key={notif.id}
              notification={notif}
              index={idx}
              onRead={onMarkRead}
            />
          ))}
        </div>
      )}
    </Drawer>
  );
}
