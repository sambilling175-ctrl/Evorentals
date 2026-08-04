"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNavbar } from "@/components/layout/top-navbar";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { CurrentUserProfile } from "@/lib/services/auth";

export function DashboardShell({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: CurrentUserProfile;
}) {
  return (
    <SidebarProvider>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-screen overflow-hidden">
          <a href="#main-content" className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
            Skip to main content
          </a>
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopNavbar currentUser={currentUser} />
            <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
              <div className="space-y-6 px-4 py-4 lg:px-6 lg:py-6">
                <BreadcrumbNav />
                {children}
              </div>
            </main>
          </div>
        </div>
      </TooltipProvider>
    </SidebarProvider>
  );
}
