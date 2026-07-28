"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Zap,
  KeyRound,
  Wrench,
  CreditCard,
  UserCheck,
  Briefcase,
  BarChart3,
  Bell,
  Settings,
  Search,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const searchGroups = [
  {
    heading: "Navigation",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/" },
      { icon: CalendarCheck, label: "Bookings", href: "/bookings" },
      { icon: Users, label: "Customers", href: "/customers" },
      { icon: Zap, label: "Fleet Management", href: "/fleet" },
      { icon: KeyRound, label: "Rentals", href: "/rentals" },
      { icon: Wrench, label: "Service & Maintenance", href: "/service" },
      { icon: CreditCard, label: "Payments", href: "/payments" },
      { icon: UserCheck, label: "Drivers", href: "/drivers" },
      { icon: Briefcase, label: "Employees", href: "/employees" },
      { icon: BarChart3, label: "Reports", href: "/reports" },
      { icon: Bell, label: "Notifications", href: "/notifications" },
      { icon: Settings, label: "Settings", href: "/settings" },
    ],
  },
  {
    heading: "Quick Actions",
    items: [
      { icon: CalendarCheck, label: "Create New Booking", href: "/bookings" },
      { icon: Users, label: "Add Customer", href: "/customers" },
      { icon: Zap, label: "Register Vehicle", href: "/fleet" },
      { icon: FileText, label: "Generate Invoice", href: "/payments" },
    ],
  },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    []
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-input bg-background/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full max-w-[260px] cursor-pointer"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline-flex">Search everything...</span>
        <span className="sm:hidden">Search...</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 max-w-[540px]">
          <DialogTitle className="sr-only">Global Search</DialogTitle>
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3">
            <div className="flex items-center border-b border-border px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Command.Input
                placeholder="Search customers, vehicles, bookings..."
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </Command.Empty>
              {searchGroups.map((group) => (
                <Command.Group
                  key={group.heading}
                  heading={group.heading}
                  className="[&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/60"
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Command.Item
                        key={item.label}
                        value={item.label}
                        onSelect={() => {
                          runCommand(() => router.push(item.href));
                        }}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors aria-selected:bg-accent"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
