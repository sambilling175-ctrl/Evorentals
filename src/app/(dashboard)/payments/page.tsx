import { ReceivablesWorkspace } from "@/components/payments/receivables-workspace";
import { getReceivablesWorkspace } from "@/lib/services/receivables";

export default async function PaymentsPage() {
  const data = await getReceivablesWorkspace();
  return <div className="space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Collections ledger</p><h1 className="mt-2 text-3xl font-bold">Rent collections</h1><p className="mt-2 text-sm text-muted-foreground">Live invoices, allocations, dues, deposits, and refund facts. No demonstration financial records.</p></div>
    <ReceivablesWorkspace data={data} />
  </div>;
}
