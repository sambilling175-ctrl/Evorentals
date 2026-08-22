import { ServiceVendorDirectory } from "@/components/service/service-vendor-directory";
import { getServiceVendorDirectory } from "@/lib/services/service-vendors";

export default async function ServiceVendorsPage() {
  const data = await getServiceVendorDirectory();
  return <ServiceVendorDirectory data={data} />;
}
