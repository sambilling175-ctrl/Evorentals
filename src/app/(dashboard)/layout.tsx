import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentUserProfile } from "@/lib/services/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUserProfile();
  if (!currentUser) redirect("/login");
  return <DashboardShell currentUser={currentUser}>{children}</DashboardShell>;
}
