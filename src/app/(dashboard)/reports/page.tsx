import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import { getReportsOverview } from "@/lib/services/reports";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReportsPage() {
  const data = await getReportsOverview();
  return <ReportsWorkspace data={data} />;
}
