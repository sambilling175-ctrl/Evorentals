import { CustomerDirectory } from "@/components/customers/customer-directory";
import { listCustomers } from "@/lib/services/customers";

export default async function CustomersPage() {
  const customers = await listCustomers();
  return <CustomerDirectory customers={customers} />;
}
