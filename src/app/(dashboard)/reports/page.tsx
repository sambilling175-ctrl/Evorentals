import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import { getReportsOverview } from "@/lib/services/reports";

export default async function ReportsPage() {
  const data = await getReportsOverview();
  return <ReportsWorkspace data={data} />;
}
