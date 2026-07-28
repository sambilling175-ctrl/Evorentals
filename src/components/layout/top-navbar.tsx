"use client";

import * as React from "react";
import { Bell, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/navigation/global-search";
import { ProfileDropdown } from "@/components/navigation/profile-dropdown";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";
import { BRANCHES } from "@/lib/constants";

export function TopNavbar() {
  const [notificationCount] = React.useState(5);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-4 lg:px-6">
      {/* Mobile Nav Trigger */}
      <MobileNav />

      {/* Global Search */}
      <div className="flex-1 flex items-center">
        <GlobalSearch />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1.5">
        {/* Date Filter */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <CalendarDays className="h-4 w-4" />
          <span className="text-xs">Today</span>
        </Button>

        {/* Branch Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <MapPin className="h-4 w-4" />
              <span className="text-xs">All Branches</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="cursor-pointer">All Branches</DropdownMenuItem>
            {BRANCHES.map((branch) => (
              <DropdownMenuItem key={branch.id} className="cursor-pointer">
                {branch.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full px-1 text-[10px] bg-destructive text-white border-0 flex items-center justify-center">
              {notificationCount}
            </Badge>
          )}
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Profile */}
        <ProfileDropdown />
      </div>
    </header>
  );
}
