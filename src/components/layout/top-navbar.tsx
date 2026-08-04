"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/navigation/global-search";
import { ProfileDropdown } from "@/components/navigation/profile-dropdown";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { CurrentUserProfile } from "@/lib/services/auth";

export function TopNavbar({ currentUser }: { currentUser: CurrentUserProfile }) {
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
        {/* Notifications */}
        <Button asChild variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
          <Link href="/notifications" aria-label="Open notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Profile */}
        <ProfileDropdown currentUser={currentUser} />
      </div>
    </header>
  );
}
