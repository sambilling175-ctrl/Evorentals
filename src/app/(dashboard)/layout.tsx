"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNavbar } from "@/components/layout/top-navbar";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopNavbar />
            <main className="flex-1 overflow-y-auto">
              <div className="px-4 py-4 lg:px-6 lg:py-6 space-y-6">
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
